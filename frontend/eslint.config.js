import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist"] },
    {
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommendedTypeChecked, // https://typescript-eslint.io/getting-started/typed-linting/
            {
                languageOptions: {
                    parserOptions: {
                        projectService: true,
                        tsconfigRootDir: import.meta.dirname,
                    },
                },
            },
        ],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": [
                "warn",
                { allowConstantExport: true },
            ],
            "@typescript-eslint/explicit-member-accessibility": "error",
            "@typescript-eslint/prefer-readonly": "error",
            // Ban try-catch blocks in favor of errorAsValue
            "no-restricted-syntax": [
                "error",
                {
                    selector: "TryStatement",
                    message:
                        "Use errorAsValue() instead of try-catch blocks for better error handling.",
                },
            ],
        },
    }
);
