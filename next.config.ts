import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The visual-direction deck is a single static page in /public.
  async rewrites() {
    return [{ source: "/designs", destination: "/visual.html" }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
