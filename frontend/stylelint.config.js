/** @type {import("stylelint").Config} */
export default {
    extends: ["stylelint-config-standard-scss"],
    plugins: [
        "./stylelint-rules/backdrop-filter-webkit.js",
        "./stylelint-rules/user-select-webkit.js",
    ],
    rules: {
        "plugin/backdrop-filter-webkit": true,
        "plugin/user-select-webkit": true,
        "selector-class-pattern": null,
        "declaration-empty-line-before": null,
        "alpha-value-notation": "number",
        "color-hex-length": "long",
        "property-no-vendor-prefix": [
            true,
            {
                ignoreProperties: [
                    "-webkit-backdrop-filter",
                    "-webkit-user-select",
                ],
            },
        ],
    },
};
