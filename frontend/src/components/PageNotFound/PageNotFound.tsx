import css from "./PageNotFound.module.scss";

export function PageNotFound() {
    return (
        <div>
            <h1 className={css.heading}>404 - Page Not Found</h1>
            <p className={css.paragraph}>
                Sorry, the page you are looking for does not exist.
            </p>
        </div>
    );
}
