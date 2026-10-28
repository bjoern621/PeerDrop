import { Trans, useTranslation } from "react-i18next";
import css from "./Tutorial.module.scss";
import { HEADING_COMPONENTS } from "../headingComponents";

export const TUTORIAL_ID = "tutorial";

export default function Tutorial() {
    const { t } = useTranslation("landing");

    return (
        <section id={TUTORIAL_ID}>
            <h2>
                <Trans
                    t={t}
                    i18nKey="tutorial.heading"
                    components={HEADING_COMPONENTS}
                />
            </h2>
            <p className="text-muted">{t("tutorial.text")}</p>
            <div className={css.cardContainer}>
                <div className={css.card1}>
                    <div className={css.cardIcon}>1</div>
                    <h3>{t("tutorial.shareToken.title")}</h3>
                    <p className="text-muted">
                        {t("tutorial.shareToken.text")}
                    </p>
                </div>
                <div className={css.card2}>
                    <div className={css.cardIcon}>2</div>
                    <h3>{t("tutorial.send.title")}</h3>
                    <p className="text-muted">{t("tutorial.send.text")}</p>
                </div>
                <div className={css.card3}>
                    <div className={css.cardIcon}>3</div>
                    <h3>{t("tutorial.accept.title")}</h3>
                    <p className="text-muted">{t("tutorial.accept.text")}</p>
                </div>
            </div>
        </section>
    );
}
