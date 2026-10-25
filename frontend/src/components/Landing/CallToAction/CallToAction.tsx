import { useTranslation } from "react-i18next";
import Link from "../../Button/Link";
import { IconArrowRight as Arrow } from "@tabler/icons-react";
import css from "./CallToAction.module.scss";

export default function CallToAction() {
    const { t } = useTranslation("landing");

    return (
        <section className={css.container}>
            <h2>{t("callToAction.heading")}</h2>
            <p className="text-muted">{t("callToAction.text")}</p>
            <Link to="/connect" className={css.ctaButton}>
                {t("callToAction.start")}
                <Arrow />
            </Link>
        </section>
    );
}
