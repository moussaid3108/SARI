import type { NextConfig } from "next";

const allowedHost = process.env.ALLOWED_HOST ?? "sari.204.168.194.217.sslip.io";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: [allowedHost],
    },
  },
};

export default nextConfig;
