"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { WAYPOINTS, sampleFlight } from "@/lib/curve";
import { damp, scroll } from "@/lib/scroll";
import { useMotionEnabled, useSceneStore } from "@/lib/store";

/** Clamp the frame delta so a dropped frame or a backgrounded tab can't fling the camera. */
const MAX_DT = 1 / 20;

/** How hard the camera chases the scroll position. Higher = tighter, lower = dreamier. */
const FOLLOW = 3.4;

/**
 * Drives the default camera along the Catmull-Rom flight path defined in
 * `@/lib/curve`, using the progress that `ScrollDriver` writes into the
 * `scroll` singleton.
 *
 * Three things happen here beyond "put the camera on the curve":
 *
 *  · **Damping.** The camera follows an eased copy of the scroll value rather
 *    than the raw one, so a flicked trackpad glides instead of snapping. The
 *    easing is frame-rate independent (see `damp`), so it feels the same at 60
 *    and 120Hz.
 *  · **Idle life.** A tiny two-frequency sway is layered on top, so the shot
 *    breathes when the visitor stops scrolling instead of freezing dead.
 *  · **Pointer parallax.** A few centimetres of lateral offset toward the
 *    pointer. Small enough to read as presence, not as a joystick.
 *
 * With reduced motion the camera snaps to the active section's waypoint and the
 * canvas is rendered on demand — no flight, no sway, no parallax.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const motion = useMotionEnabled();
  const activeIndex = useSceneStore((s) => s.activeIndex);

  // Pre-allocated. Nothing in the frame loop is allowed to allocate.
  const v = useMemo(
    () => ({ pos: new Vector3(), tgt: new Vector3(), sway: new Vector3(), side: new Vector3() }),
    []
  );
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const clock = useRef(0);
  const lastFov = useRef(WAYPOINTS[0].fov);

  /* Pointer parallax input. Ignored entirely when motion is off. */
  useEffect(() => {
    if (!motion) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    // Coarse pointers have no hover, so there's nothing meaningful to track.
    if (window.matchMedia("(pointer: fine)").matches) {
      window.addEventListener("pointermove", onMove, { passive: true });
      return () => window.removeEventListener("pointermove", onMove);
    }
  }, [motion]);

  /**
   * Narrow viewports see far less horizontally at the same fov, which cropped the
   * arch out of frame on a phone. Widen the fov as the aspect ratio narrows so
   * every waypoint frames the same subject on any device.
   */
  const fovBoost = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    if (aspect >= 1.6) return 0;
    // +0 at 16:10, up to about +13° at a 9:19.5 phone.
    return Math.min(13, (1.6 - aspect) * 15);
  }, [size.width, size.height]);

  /* Reduced motion: place the camera on the active waypoint and draw one frame. */
  useEffect(() => {
    if (motion) return;
    const wp = WAYPOINTS[Math.min(WAYPOINTS.length - 1, Math.max(0, activeIndex))];
    camera.position.set(...wp.p);
    v.tgt.set(...wp.t);
    camera.up.set(0, 1, 0);
    camera.lookAt(v.tgt);
    camera.fov = wp.fov + fovBoost;
    camera.updateProjectionMatrix();
    invalidate();
  }, [motion, activeIndex, camera, invalidate, v, fovBoost]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(MAX_DT, rawDelta);

    if (!motion) {
      // The effect above owns the camera in this mode. Nothing to do per-frame.
      return;
    }

    clock.current += dt;

    // Chase the scroll value.
    scroll.eased = damp(scroll.eased, scroll.progress, FOLLOW, dt);

    const s = sampleFlight(scroll.eased);
    v.pos.copy(s.position);
    v.tgt.copy(s.target);

    // Idle sway: two incommensurate frequencies so it never visibly repeats.
    const t = clock.current;
    v.sway.set(
      Math.sin(t * 0.21) * 0.16 + Math.sin(t * 0.53) * 0.05,
      Math.sin(t * 0.17 + 1.3) * 0.11 + Math.sin(t * 0.41) * 0.035,
      Math.cos(t * 0.19 + 0.7) * 0.1
    );

    // Pointer parallax, smoothed so it trails the cursor rather than twitching.
    const p = pointer.current;
    p.sx = damp(p.sx, p.x, 2.6, dt);
    p.sy = damp(p.sy, p.y, 2.6, dt);

    // Offset laterally in *camera* space, so parallax always reads as sideways
    // regardless of which way along the path the camera is pointing.
    v.side.subVectors(v.tgt, v.pos).normalize().cross(camera.up).normalize();
    v.pos.addScaledVector(v.side, p.sx * 0.55).add(v.sway);
    v.pos.y += -p.sy * 0.32;

    camera.position.copy(v.pos);

    // Aim. Nudge the look-target with the pointer too, by less than the position,
    // which produces a gentle head-turn instead of a pure strafe.
    v.tgt.addScaledVector(v.side, p.sx * 0.22);
    camera.up.set(0, 1, 0);
    camera.lookAt(v.tgt);

    // Roll is applied after lookAt: rotating on the camera's local Z is, by
    // definition, roll about the view axis.
    if (s.roll) camera.rotateZ(s.roll);

    // updateProjectionMatrix is not free — only call it when fov actually moved.
    const fov = s.fov + fovBoost;
    if (Math.abs(fov - lastFov.current) > 0.02) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
      lastFov.current = fov;
    }
  });

  return null;
}
