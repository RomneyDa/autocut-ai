import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/autocut",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/autocut",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/autocut",
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
