import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "web.ccpgamescdn.com",
        pathname: "/eveonlineassets/**",
      },
    ],
  },
};

export default nextConfig;
