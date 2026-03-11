import type { NextConfig } from "next";

// Keep TS config aligned with next.config.js to avoid accidental overrides.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 16 uses Turbopack by default; next-pwa injects webpack config.
  // An explicit (even empty) Turbopack config avoids a hard error.
  turbopack: {},
};

export default withPWA(nextConfig);
