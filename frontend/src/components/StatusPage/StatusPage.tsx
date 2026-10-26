import { Trans, useTranslation } from "react-i18next";
import css from "./StatusPage.module.scss";
import Link from "../Button/Link";

/** A page that names a state of the site in place of content, with a way back home. */
export default function StatusPage({
    code,
    i18nKey,
    fullScreen = false,
}: {
    /** Short code shown large, e.g. "404". */
    code: string;
    i18nKey: "pages.notFound" | "pages.workInProgress";
    /** Fills the window, for a page shown without header and footer. */
    fullScreen?: boolean;
}) {
    const { t } = useTranslation();

    return (
        <div className={`${css.container} ${fullScreen ? css.fullScreen : ""}`}>
            <div className={css.content}>
                <div className={css.code}>{code}</div>
                <h1 className={css.heading}>
                    <Trans
                        t={t}
                        i18nKey={`${i18nKey}.heading`}
                        components={{
                            highlight: <span className={css.highlight} />,
                        }}
                    />
                </h1>
                <p className={css.paragraph}>{t(`${i18nKey}.text`)}</p>
                <div className={css.actions}>
                    <Link to="/" className={css.homeButton}>
                        {t("pages.backHome")}
                    </Link>
                </div>
            </div>
        </div>
    );
}
