import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: 'standalone',
  // Allow the app to be served from these hostnames
  allowedDevOrigins: [
    'http://localhost:3030',
    'http://127.0.0.1:3030',
    'https://sauna.tudobem.app:3030',
  ],
};

export default nextConfig;
