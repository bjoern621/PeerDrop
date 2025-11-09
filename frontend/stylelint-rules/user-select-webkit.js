import stylelint from "stylelint";

const ruleName = "plugin/user-select-webkit";
const messages = stylelint.utils.ruleMessages(ruleName, {
    expected:
        "Expected -webkit-user-select before user-select for Safari support",
});

const meta = {
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/user-select",
};

const ruleFunction = (primary, secondaryOptions, context) => {
    return (root, result) => {
        const validOptions = stylelint.utils.validateOptions(result, ruleName, {
            actual: primary,
        });

        if (!validOptions) {
            return;
        }

        root.walkDecls("user-select", decl => {
            // Check if this is -webkit-user-select (skip it)
            if (decl.prop === "-webkit-user-select") {
                return;
            }

            // Check if the previous declaration is -webkit-user-select with the same value
            const prevDecl = decl.prev();
            const hasWebkitPrefix =
                prevDecl &&
                prevDecl.type === "decl" &&
                prevDecl.prop === "-webkit-user-select" &&
                prevDecl.value === decl.value;

            if (!hasWebkitPrefix) {
                if (context.fix) {
                    // Auto-fix: insert -webkit-user-select before user-select
                    const webkitDecl = decl.clone({
                        prop: "-webkit-user-select",
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
