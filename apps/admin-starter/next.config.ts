import type { NextConfig } from "next";

const config: NextConfig = {
  // Shared packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@gitwork/admin-shell", "@gitwork/data", "@gitwork/modules", "@gitwork/tokens", "@gitwork/ui"],
  reactStrictMode: true,
  // STATIC_EXPORT=1 next build → out/ (plain files, e.g. for Cloudflare Workers static assets).
  ...(process.env.STATIC_EXPORT ? { output: "export" as const } : {}),
};

export default config;
