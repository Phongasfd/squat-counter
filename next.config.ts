import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads the session cookie, so the app renders per request.
  // Cache Components is left off to keep that model simple.
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
