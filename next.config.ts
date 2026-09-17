import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["google-play-scraper", "app-store-scraper", "got-scraping"],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
