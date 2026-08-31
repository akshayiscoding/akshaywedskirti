import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three.js ships untranspiled ESM examples; keep them out of the RSC graph noise
  transpilePackages: ["three"],
  experimental: {
    optimizePackageImports: ["framer-motion", "@react-three/drei"],
  },
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
