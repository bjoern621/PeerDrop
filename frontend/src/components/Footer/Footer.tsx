import { useTranslation } from "react-i18next";
import Logo from "../Logo/Logo";
import css from "./Footer.module.scss";
import { IconBrandGithub as GitHubIcon } from "@tabler/icons-react";
import Anchor from "../Anchor/Anchor";
import ThemeToggle from "../ThemeToggle/ThemeToggle";

type FooterProps = {
    // Set by pages whose content needs the vertical space.
    compact?: boolean;
};

export default function Footer({ compact = false }: FooterProps) {
    const { t } = useTranslation();

    if (compact) {
        return (
            <footer className={css.compactFooter}>
                <span className={css.version}>
                    {t("footer.version")} {import.meta.env.VITE_APP_VERSION}
                </span>
                <Anchor to="/inside" underline="none">
                    {t("footer.insidePeerDrop")}
                </Anchor>
                <Anchor to="/faq" underline="none">
                    {t("footer.faq")}
                </Anchor>
                <Anchor
                    to="https://github.com/bjoern621/PeerDrop"
                    underline="none"
                >
                    GitHub
                </Anchor>
                <span className={css.compactTheme}>
                    <ThemeToggle />
                </span>
            </footer>
        );
    }

    return (
        <footer className={css.footer}>
            <div className={css.column}>
                <Logo aria-hidden />
                <div className={css.version}>
                    {t("footer.version")} <br />
                    {import.meta.env.VITE_APP_VERSION}
                </div>
            </div>
            <div className={css.column}>
                <div className={css.heading}>{t("footer.furtherLinks")}</div>
                <nav>
                    <ul>
                        <li>
                            <Anchor to="/inside" underline="none">
                                {t("footer.insidePeerDrop")}
                            </Anchor>
                        </li>
                        {/* <li>Preise</li> */} {/* TODO */}
                        {/* <li>Entstehung</li> */}
                        <li>
                            <Anchor to="/faq" underline="none">
                                {t("footer.faq")}
                            </Anchor>
                        </li>
                    </ul>
                </nav>
            </div>
            <div className={css.column}>
                <div className={css.heading}>{t("footer.information")}</div>
                <nav>
                    <ul>
                        <li>
                            <ThemeToggle />
                        </li>
                        {/* <li>Impressum</li>
                        <li>Datenschutz</li>
                        <li>Cookies verwalten</li>
                        <li>Nutzungsbedingungen</li> */}
                        {/* TODO */}
                    </ul>
                </nav>
            </div>
            <div className={css.column}>
                <div className={css.heading}>{t("footer.elsewhere")}</div>
                <nav>
                    <ul className={css.socials}>
                        <li>
                            <Anchor
                                to="https://github.com/bjoern621/PeerDrop"
                                underline="none"
                                className={css.iconLink}
                            >
                                <GitHubIcon aria-hidden /> GitHub
                            </Anchor>
                        </li>
                    </ul>
                </nav>
            </div>
        </footer>
    );
}
