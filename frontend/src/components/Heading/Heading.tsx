import { Link, NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import Logo from "../Logo/Logo";
import css from "./Heading.module.scss";
import StableText from "../StableText/StableText";
import AuthButton from "../Auth/AuthButton";
import SettingsMenu from "../SettingsMenu/SettingsMenu";
import { LanguageFlagButton } from "../LanguageToggle/LanguageToggle";

export default function Heading() {
    const { t } = useTranslation();

    return (
        <header className={css.header}>
            <div className={css.headerContent}>
                <Link to="/" aria-label={t("header.homeLink")}>
                    <Logo aria-hidden />
                </Link>
                <nav
                    className={css.navigation}
                    aria-label={t("header.navigation")}
                >
                    <NavLink to="/" aria-label={t("header.howItWorksLink")}>
                        <StableText
                            text={t("header.howItWorks")}
                            fontWeight={"var(--font-weight-semibold)"}
                        />
                    </NavLink>
                    <NavLink to="/connect" aria-label={t("header.shareLink")}>
                        <StableText
                            text={t("header.share")}
                            fontWeight={"var(--font-weight-semibold)"}
                        />
                    </NavLink>
                </nav>
            </div>

            <div className={css.authSection}>
                <LanguageFlagButton />
                <SettingsMenu />
                <AuthButton />
            </div>
        </header>
    );
}
