import { Trans, useTranslation } from "react-i18next";
import css from "./PageNotFound.module.scss";
import Link from "../Button/Link";

export function PageNotFound() {
    const { t } = useTranslation();

    return (
        <div className={css.container}>
            <div className={css.content}>
                <div className={css.errorCode}>404</div>
                <h1 className={css.heading}>
                    <Trans
                        t={t}
                        i18nKey="pages.notFound.heading"
                        components={{
                            highlight: <span className={css.highlight} />,
                        }}
                    />
                </h1>
                <p className={css.paragraph}>{t("pages.notFound.text")}</p>
                <div className={css.actions}>
                    <Link to="/" className={css.homeButton}>
                        {t("pages.backHome")}
                    </Link>
                </div>
            </div>
        </div>
    );
}
