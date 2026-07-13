/** @type {import("stylelint").Config} */
export default {
    extends: ["stylelint-config-standard-scss"],
    ignoreFiles: ["dist/**", "build/**", "coverage/**"],
    plugins: [
        "./stylelint-rules/backdrop-filter-webkit.js",
        "./stylelint-rules/user-select-webkit.js",
    ],
    rules: {
        "plugin/backdrop-filter-webkit": true,
        "plugin/user-select-webkit": true,
        "selector-class-pattern": null,
        // Keyframe names follow the repo's camelCase identifier convention.
        "keyframes-name-pattern": null,
        // Noisy for state-based grouping (:hover/:disabled/::before variants);
        // reordering by specificity hurts readability without preventing bugs.
        "no-descending-specificity": null,
        // SCSS mixins wrapping @media with declarations expand inside a selector
        // at the call site, which stylelint cannot resolve statically.
        "no-invalid-position-declaration": null,
        // CSS Modules require @extend of real classes that JS references by name;
        // a %placeholder emits no class and would break css.<name> lookups.
        "scss/at-extend-no-missing-placeholder": null,
        "declaration-empty-line-before": null,
        "alpha-value-notation": "number",
        "color-hex-length": "long",
        "property-no-vendor-prefix": [
            true,
            {
                ignoreProperties: [
                    "backdrop-filter",
                    "user-select",
                    "background-clip",
                ],
            },
        ],
        // :global / :local are CSS Modules pseudo-classes.
        "selector-pseudo-class-no-unknown": [
            true,
            {
                ignorePseudoClasses: ["global", "local"],
            },
        ],
    },
};
