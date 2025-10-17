import Logo from "../Logo/Logo";
import css from "./Footer.module.scss";
import GitHubIcon from "../../assets/icons8-github.svg?react";
import Anchor from "../Anchor/Anchor";
import ThemeToggle from "../ThemeToggle/ThemeToggle";

export default function Footer() {
    return (
        <footer className={css.footer}>
            <Logo aria-hidden />
            <div className={css.heading}>Weiterführende Links</div>
            <div className={css.heading}>Information</div>
            <div className={css.heading}>Auch hier</div>
            <div className={css.version}>
                Version: <br />
                {import.meta.env.VITE_APP_VERSION}
            </div>
            <nav>
                <ul>
                    <li>
                        <Anchor to="/inside" underline="none">
                            Inside PeerDrop
                        </Anchor>
                    </li>
                    <li>Preise</li>
                    <li>Entstehung</li>
                </ul>
            </nav>
            <nav>
                <ul>
                    <li>
                        <ThemeToggle />
                    </li>
                    <li>Impressum</li>
                    <li>Datenschutz</li>
                    <li>Cookies verwalten</li>
                    <li>Nutzungsbedingungen</li>
                </ul>
            </nav>
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
        </footer>
    );
}
