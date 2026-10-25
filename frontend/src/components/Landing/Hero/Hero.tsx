import { Trans, useTranslation } from "react-i18next";
import css from "./Hero.module.scss";
import { IconArrowRight as Arrow } from "@tabler/icons-react";
import Illustration from "../../../assets/illustrations/hero_illustration.svg?react";
import Link from "../../Button/Link";
import { TUTORIAL_ID } from "../Tutorial/Tutorial";

export default function Hero() {
    const { t } = useTranslation("landing");

    return (
        <section className={css.container}>
            <Illustration aria-hidden />
            <h1>
                <Trans
                    t={t}
                    i18nKey="hero.heading"
                    components={{
                        highlight: <span className="text-highlight" />,
                    }}
                />
            </h1>
            <p className="text-muted">{t("hero.text")}</p>
            <div className={css.actions}>
                <Link to="/connect">
                    {t("hero.start")}
                    <Arrow aria-hidden />
                </Link>
                <Link
                    to={`#${TUTORIAL_ID}`}
                    variant="outline"
                    onClick={() => {
                        document.getElementById(TUTORIAL_ID)!.scrollIntoView({
                            block: "center",
                        });
                    }}
                >
                    {t("hero.howItWorks")}
                </Link>
            </div>
        </section>
    );
}
