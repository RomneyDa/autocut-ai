import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/autocut",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/autocut",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
