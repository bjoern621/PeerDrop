import { Link, NavLink } from "react-router";
import Logo from "../Logo/Logo";
import css from "./Heading.module.scss";
import StableText from "../StableText/StableText";

export default function Heading() {
    return (
        <header className={css.header}>
            <div className={css.headerContent}>
                <Link to="/" aria-label="Zur Startseite navigieren">
                    <Logo aria-hidden />
                </Link>
                <nav className={css.navigation} aria-label="Hauptnavigation">
                    <NavLink to="/">
                        <StableText
                            text="So funktioniert's"
                            fontWeight={"var(--font-weight-medium)"}
                        />
                    </NavLink>
                    <NavLink to="/connect">
                        <StableText
                            text="Dateien teilen"
                            fontWeight={"var(--font-weight-medium)"}
                        />
                    </NavLink>
                </nav>
            </div>
        </header>
    );
}
