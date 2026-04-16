import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Ignore build artifacts and node_modules
    ignores: ["dist/", "node_modules/", "bun.lockb"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node, // Node.js globals for backend logic
        ...globals.builtin,
        Bun: "readonly", // Specific global for Bun APIs
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "off", // Usually allowed in backends
    },
  }
);
