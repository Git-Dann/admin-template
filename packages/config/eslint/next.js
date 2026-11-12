import next from "@next/eslint-plugin-next";
import base from "./index.js";

/** Config for Next.js client apps. */
export default [
  ...base,
  {
    plugins: { "@next/next": next },
    rules: { ...next.configs.recommended.rules, ...next.configs["core-web-vitals"].rules },
  },
];
