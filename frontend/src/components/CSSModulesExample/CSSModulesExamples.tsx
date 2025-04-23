import css from "./CSSModulesExamples.module.scss";

export function CSSModulesExamples() {
    return (
        <div>
            <h1 className={css.heading}>CSS Modules Example</h1>
            <p className={css.paragraph}>
                This is an example of using CSS Modules in a React component.
            </p>
        </div>
    );
}
