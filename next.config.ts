import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    // 'unsafe-inline'/'unsafe-eval' on script-src are required by Next's dev
    // overlay and the TensorFlow.js/WASM pose-detection pipeline; connect-src
    // blob: is needed for camera frame processing.
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' blob: https:",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Render (and most non-Vercel hosts) run a plain `node server.js` —
  // standalone output bundles only the production deps actually needed,
  // instead of requiring `node_modules` on the host.
  output: "standalone",
  images: {
    // Google OAuth profile pictures (sidebar/profile avatar) — the only
    // external image source in the app.
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
