import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "out/**"],
  },
  {
    rules: {
      // r3f uses many-arg JSX props and unknown-to-eslint three elements
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unknown-property": "off",
    },
  },
];

export default eslintConfig;
