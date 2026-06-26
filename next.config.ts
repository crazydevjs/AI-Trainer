import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // We only use MoveNet from @tensorflow-models/pose-detection. That package
  // statically imports @mediapipe/pose (BlazePose), whose module has no ESM
  // exports and breaks the build. Alias it to a harmless stub.
  turbopack: {
    resolveAlias: {
      "@mediapipe/pose": "./src/lib/mediapipe-stub.ts",
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@mediapipe/pose": path.resolve(process.cwd(), "src/lib/mediapipe-stub.ts"),
    };
    return config;
  },
};

export default nextConfig;
