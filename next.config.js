const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16 uses Turbopack by default; next-pwa injects webpack config.
  // An explicit (even empty) Turbopack config avoids a hard error.
  turbopack: {},
};

module.exports = withPWA(nextConfig);
