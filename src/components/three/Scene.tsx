"use client";

import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveEvents, Preload, SoftShadows } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { BackSide, BufferAttribute, Color, SphereGeometry, Vector3 } from "three";

import { WAYPOINTS } from "@/lib/curve";
import { useMotionEnabled, useQualityPreset, useSceneStore } from "@/lib/store";
import { PALETTE } from "./paper";

import { CameraRig } from "./CameraRig";
import { Ground, AisleRunner, Hills } from "./Ground";
import { Arch, Dais } from "./Arch";
import { Chairs } from "./Seating";
import { Reception } from "./Reception";
import { Trees } from "./Foliage";
import { Gazebo, Signpost } from "./Structures";
import { StringLights } from "./StringLights";
import { Lanterns } from "./Lanterns";
import { Petals } from "./Petals";

/** Where the low sun sits. Everything warm in the scene is justified by this. */
const SUN = new Vector3(-26, 17, -34);

/* ────────────────────────────────────────────────────────────────────────────
   Sky
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Gradient sky dome.
 *
 * Deliberately vertex-coloured rather than a custom ShaderMaterial: a raw
 * ShaderMaterial bypasses three's tone-mapping and colour-management pipeline
 * unless you re-include the right chunks, and the sky would then drift out of
 * step with every lit object in the scene. A vertex-coloured `MeshBasicMaterial`
 * goes through the normal pipeline, so the horizon always matches the light.
 */
function SkyDome() {
  const geometry = useMemo(() => {
    // 64×48 is generous, but a coarse dome shows visible Mach banding on a
    // gradient this soft, and the mesh is unlit backfaces — it costs nothing.
    const geo = new SphereGeometry(190, 64, 48);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const horizon = new Color(PALETTE.sky);
    const mid = new Color("#f7ecdd");
    const top = new Color("#e7e2dc");
    const sunTint = new Color(PALETTE.glowWarm);

    const sunDir = SUN.clone().normalize();
    const dir = new Vector3();
    const c = new Color();

    for (let i = 0; i < pos.count; i++) {
      dir.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      const h = dir.y;

      // Two soft stops: horizon → mid → zenith.
      const t1 = smoothstep(-0.08, 0.3, h);
      const t2 = smoothstep(0.2, 0.9, h);
      c.copy(horizon).lerp(mid, t1).lerp(top, t2);

      // A broad warm bloom around the sun, strongest at the horizon so it reads
      // as late-afternoon haze rather than a lens flare.
      const toSun = Math.max(0, dir.dot(sunDir));
      const glow = Math.pow(toSun, 4) * 0.55 * (1 - smoothstep(0.1, 0.7, h));
      c.lerp(sunTint, glow);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute("color", new BufferAttribute(colors, 3));
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={-1}>
      {/* depthWrite off so the dome never occludes anything, fog off so it
          doesn't get hazed into flat grey by its own atmosphere. */}
      <meshBasicMaterial vertexColors side={BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/* ────────────────────────────────────────────────────────────────────────────
   Light
   ──────────────────────────────────────────────────────────────────────────── */

function Lighting() {
  const preset = useQualityPreset();

  return (
    <>
      {/* Sky bounce: warm from above, sage from the grass below. Does most of
          the work of an environment map for a fraction of the cost. */}
      <hemisphereLight args={[PALETTE.sky, PALETTE.grass, 0.62]} />
      <ambientLight color={PALETTE.ivory} intensity={0.22} />

      {/* The sun. Low and behind the arch, so shadows rake down the aisle
          toward the viewer and every paper edge picks up a rim. */}
      <directionalLight
        position={SUN}
        intensity={2.7}
        color={PALETTE.sun}
        castShadow={preset.shadows}
        shadow-mapSize-width={preset.shadowMap}
        shadow-mapSize-height={preset.shadowMap}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
        // normalBias matters far more than bias on flat-shaded low-poly card:
        // it offsets along the normal and kills the acne on the near-parallel
        // facets without the peter-panning that a large depth bias causes.
        shadow-bias={-0.0004}
        shadow-normalBias={0.028}
      />

      {/* Blush fill from the opposite side, standing in for light bouncing off
          the ivory runner and the paper florals. Keeps shadows from going dead. */}
      <directionalLight position={[20, 9, 24]} intensity={0.55} color={PALETTE.blush} />

      {/* A cool sliver from behind separates the tree line from the hills. */}
      <directionalLight position={[6, 12, -46]} intensity={0.3} color="#dfe6ea" />
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Performance watchdog
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Measures real frame rate and drops a quality tier when the device can't hold
 * up. The device-capability guess in `Bootstrap` is a guess; this is the ground
 * truth. Only ever degrades — hunting up and down between tiers would cause
 * visible shader recompiles mid-scroll.
 */
function PerfWatchdog() {
  const degrade = useSceneStore((s) => s.degrade);
  const quality = useSceneStore((s) => s.quality);
  const state = useRef({ frames: 0, elapsed: 0, strikes: 0 });

  useFrame((_, delta) => {
    if (quality === "low") return;

    const s = state.current;
    s.frames += 1;
    s.elapsed += delta;

    // Sample in ~1.5s windows. Shorter windows react to a single GC pause.
    if (s.elapsed < 1.5) return;

    const fps = s.frames / s.elapsed;
    s.frames = 0;
    s.elapsed = 0;

    // Ignore the first window or two: shader compilation and shadow-map warmup
    // make startup frames meaningless.
    if (fps < 42) {
      s.strikes += 1;
      if (s.strikes >= 2) {
        s.strikes = 0;
        degrade();
      }
    } else {
      s.strikes = 0;
    }
  });

  return null;
}

/** Flags the store once a real frame has been drawn, so the loader can retire. */
function ReadySignal() {
  const setReady = useSceneStore((s) => s.setReady);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    // Two rAFs: one to let this effect's frame complete, one to be confident
    // something was actually rasterised.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [setReady, gl]);

  return null;
}

/* ────────────────────────────────────────────────────────────────────────────
   Error boundary
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * A wedding website must never render a blank page. If WebGL is unavailable,
 * blocked, or the context is lost, fall back to a static painted gradient that
 * echoes the diorama's palette. The DOM content sits on top of it and the site
 * stays entirely usable.
 */
class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[Scene] 3D canvas unavailable, falling back to a flat backdrop.", error);
  }

  render() {
    if (this.state.failed) return <StaticBackdrop />;
    return this.props.children;
  }
}

/** CSS-only stand-in for the diorama: sky, haze, hills, ground. */
export function StaticBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, #e7e2dc 0%, #f7ecdd 46%, ${PALETTE.sky} 62%, ${PALETTE.grassDry} 63%, ${PALETTE.grass} 100%)`,
        }}
      />
      {/* Warm sun haze, positioned where the real sun sits. */}
      <div
        className="absolute"
        style={{
          left: "12%",
          top: "22%",
          width: "46vw",
          height: "46vw",
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${PALETTE.glowWarm}55 0%, transparent 66%)`,
        }}
      />
      {/* Three hill silhouettes, palest furthest back. */}
      {[
        { c: PALETTE.hill2, h: 26, o: 0.9 },
        { c: PALETTE.hill1, h: 20, o: 0.95 },
        { c: PALETTE.hill0, h: 14, o: 1 },
      ].map((hill, i) => (
        <div
          key={i}
          className="absolute inset-x-0"
          style={{
            bottom: `${37 - i * 3}%`,
            height: `${hill.h}%`,
            opacity: hill.o,
            background: hill.c,
            maskImage:
              "radial-gradient(120% 100% at 50% 100%, #000 60%, transparent 61%), linear-gradient(#000,#000)",
            maskComposite: "intersect",
            borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
          }}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Scene
   ──────────────────────────────────────────────────────────────────────────── */

export function Scene() {
  const preset = useQualityPreset();
  const motion = useMotionEnabled();

  return (
    <CanvasBoundary>
      <Canvas
        // The DOM sections sit on top and must stay clickable. Disabling pointer
        // events here also means r3f never raycasts, which is free performance —
        // nothing in the diorama is interactive.
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        dpr={preset.dpr}
        shadows={preset.shadows ? "soft" : false}
        // "demand" for a reduced-motion visitor: the camera snaps on section
        // change and we draw exactly one frame per change instead of 60/s forever.
        frameloop={motion ? "always" : "demand"}
        gl={{
          antialias: true,
          alpha: false,
          stencil: false,
          powerPreference: "high-performance",
          // Nothing reads the canvas back, so let the driver discard it.
          preserveDrawingBuffer: false,
        }}
        camera={{
          position: WAYPOINTS[0].p,
          fov: WAYPOINTS[0].fov,
          near: 0.4,
          far: 320,
        }}
      >
        {/* Warm exponential haze. Makes the hill layers recede and hides the
            point where the ground plane ends. */}
        <fogExp2 attach="fog" args={[PALETTE.hill2, 0.0105]} />

        <SkyDome />
        <Lighting />

        {/* PCSS soft shadows — only at "high". This patches the shadow shader at
            module level, so it must not be toggled per-frame. */}
        {preset.shadows && preset.post && <SoftShadows size={24} samples={8} focus={0.7} />}

        <CameraRig />
        <PerfWatchdog />
        <AdaptiveEvents />

        <Suspense fallback={null}>
          {/* ── the diorama ── */}
          <Hills />
          <Ground />
          <AisleRunner />

          <Dais />
          <Arch />
          <Chairs />
          <Reception />

          <Trees />
          <Gazebo />
          <Signpost />

          <StringLights />
          <Lanterns />
          <Petals />

          <Preload all />
          <ReadySignal />
        </Suspense>

        {preset.post && (
          <EffectComposer multisampling={4}>
            {/* Threshold sits above the paper tones so only the emissive bulbs
                and lanterns bloom — the ivory card must not glow. */}
            <Bloom
              intensity={0.72}
              luminanceThreshold={0.78}
              luminanceSmoothing={0.28}
              mipmapBlur
              radius={0.72}
            />
            <Vignette offset={0.3} darkness={0.44} />
          </EffectComposer>
        )}
      </Canvas>
    </CanvasBoundary>
  );
}

export default Scene;
