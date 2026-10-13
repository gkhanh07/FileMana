import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The Playwright run builds into its own folder so it never clobbers a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
