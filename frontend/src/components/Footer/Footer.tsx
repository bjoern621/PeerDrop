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
    if (compact) {
        return (
            <footer className={css.compactFooter}>
                <span className={css.version}>
                    Version: {import.meta.env.VITE_APP_VERSION}
                </span>
                <Anchor to="/inside" underline="none">
                    Inside PeerDrop
                </Anchor>
                <Anchor to="/faq" underline="none">
                    FAQ
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
                    Version: <br />
                    {import.meta.env.VITE_APP_VERSION}
                </div>
            </div>
            <div className={css.column}>
                <div className={css.heading}>Weiterführende Links</div>
                <nav>
                    <ul>
                        <li>
                            <Anchor to="/inside" underline="none">
                                Inside PeerDrop
                            </Anchor>
                        </li>
                        {/* <li>Preise</li> */} {/* TODO */}
                        {/* <li>Entstehung</li> */}
                        <li>
                            <Anchor to="/faq" underline="none">
                                FAQ
                            </Anchor>
                        </li>
                    </ul>
                </nav>
            </div>
            <div className={css.column}>
                <div className={css.heading}>Information</div>
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
                <div className={css.heading}>Auch hier</div>
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
