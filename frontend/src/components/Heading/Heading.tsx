import { Link, NavLink } from "react-router";
import Logo from "../Logo/Logo";
import css from "./Heading.module.scss";
import StableText from "../StableText/StableText";
import AuthButton from "../Auth/AuthButton";

export default function Heading() {
    return (
        <header className={css.header}>
            <div className={css.headerContent}>
                <Link to="/" aria-label="Zur Startseite navigieren">
                    <Logo aria-hidden />
                </Link>
                <nav className={css.navigation} aria-label="Hauptnavigation">
                    <NavLink to="/" aria-label="Zur Hauptseite navigieren">
                        <StableText
                            text="So funktioniert's"
                            fontWeight={"var(--font-weight-medium)"}
                        />
                    </NavLink>
                    <NavLink
                        to="/connect"
                        aria-label="Zur Dateifreigabe navigieren"
                    >
                        <StableText
                            text="Dateien teilen"
                            fontWeight={"var(--font-weight-medium)"}
                        />
                    </NavLink>
                </nav>
            </div>

            <div className={css.authSection}>
                <AuthButton />
            </div>
        </header>
    );
}
