import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/autocut",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/autocut",
  },
};

export default nextConfig;
