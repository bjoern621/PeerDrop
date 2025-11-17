import css from "./WorkInProgress.module.scss";
import Link from "../Button/Link";

export function WorkInProgress() {
    return (
        <div className={css.container}>
            <div className={css.content}>
                <div className={css.statusCode}>WIP</div>
                <h1 className={css.heading}>
                    Seite <span className={css.highlight}>in Arbeit</span>
                </h1>
                <p className={css.paragraph}>
                    Diese Seite befindet sich noch in der Entwicklung. Sie
                    sollte bald verfügbar sein.
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
