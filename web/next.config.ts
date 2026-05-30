import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Empty turbopack config satisfies Next.js 16 Turbopack default
  turbopack: {},
  async headers() {
    return [
      {
        // Required for SharedArrayBuffer (multi-threaded WASM used by Kokoro)
        source: "/tour/:id/play",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
