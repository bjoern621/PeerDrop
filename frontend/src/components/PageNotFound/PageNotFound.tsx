import css from "./PageNotFound.module.scss";
import Link from "../Button/Link";

export function PageNotFound() {
    return (
        <div className={css.container}>
            <div className={css.content}>
                <div className={css.errorCode}>404</div>
                <h1 className={css.heading}>
                    Seite <span className={css.highlight}>nicht gefunden</span>
                </h1>
                <p className={css.paragraph}>
                    Die von dir gesuchte Seite existiert leider nicht.
                    Vielleicht hast du dich vertippt oder die Seite wurde
                    verschoben.
                </p>
                <div className={css.actions}>
                    <Link to="/" className={css.homeButton}>
                        Zurück zur Startseite
                    </Link>
                </div>
            </div>
        </div>
    );
}
