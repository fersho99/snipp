import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  {
    // Photos come from the demo files and from images the user uploads in
    // the browser (blob: URLs), which next/image cannot optimize. Revisit
    // when the API serves optimized images (RNF-W05).
    rules: { '@next/next/no-img-element': 'off' },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Client app exported by `npm run app` (built from ../mobile).
    "public/app/**",
    // Reports and traces written by Playwright (`npm run test:e2e`).
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
