import typescriptEslint from "@typescript-eslint/eslint-plugin";
import stylisticTs from "@stylistic/eslint-plugin-ts";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import {fileURLToPath} from "node:url";
import js from "@eslint/js";
import {FlatCompat} from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["dist/*"],
}, ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
), {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        "@stylistic/ts": stylisticTs,
    },
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
            ...globals.commonjs,
            ...globals.mocha,
        },
        parser: tsParser,
        ecmaVersion: 2018,
        sourceType: "module",
    },
    rules: {
        "@typescript-eslint/no-this-alias": 0,
        "@typescript-eslint/no-explicit-any": 0,
        "no-unused-vars": ["error", {"argsIgnorePattern": "^_"}],
        "@typescript-eslint/no-unused-vars": ["error", {"argsIgnorePattern": "^_"}],
        "@typescript-eslint/ban-ts-comment": "off",
        "@stylistic/ts/semi": ["error", "always"]
    },
}];