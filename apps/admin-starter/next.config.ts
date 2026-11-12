import type { NextConfig } from "next";

const config: NextConfig = {
  // Shared packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@gitwork/admin-shell", "@gitwork/data", "@gitwork/modules", "@gitwork/tokens", "@gitwork/ui"],
  reactStrictMode: true,
};

export default config;
