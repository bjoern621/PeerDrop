import stylelint from "stylelint";

const ruleName = "plugin/backdrop-filter-webkit";
const messages = stylelint.utils.ruleMessages(ruleName, {
    expected:
        "Expected -webkit-backdrop-filter before backdrop-filter for Safari 9+ support",
});

const meta = {
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter",
};

const ruleFunction = (primary, secondaryOptions, context) => {
    return (root, result) => {
        const validOptions = stylelint.utils.validateOptions(result, ruleName, {
            actual: primary,
        });

        if (!validOptions) {
            return;
        }

        root.walkDecls("backdrop-filter", decl => {
            // Check if this is -webkit-backdrop-filter (skip it)
            if (decl.prop === "-webkit-backdrop-filter") {
                return;
            }

            // Check if the previous declaration is -webkit-backdrop-filter with the same value
            const prevDecl = decl.prev();
            const hasWebkitPrefix =
                prevDecl &&
                prevDecl.type === "decl" &&
                prevDecl.prop === "-webkit-backdrop-filter" &&
                prevDecl.value === decl.value;

            if (!hasWebkitPrefix) {
                if (context.fix) {
                    // Auto-fix: insert -webkit-backdrop-filter before backdrop-filter
                    const webkitDecl = decl.clone({
                        prop: "-webkit-backdrop-filter",
                    });
                    decl.parent?.insertBefore(decl, webkitDecl);
                } else {
                    stylelint.utils.report({
                        message: messages.expected,
                        node: decl,
                        result,
                        ruleName,
                    });
                }
            }
        });
    };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default stylelint.createPlugin(ruleName, ruleFunction);
