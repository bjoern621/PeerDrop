import { Link, NavLink } from "react-router";
import Logo from "../Logo/Logo";
import css from "./Heading.module.scss";

export default function Heading() {
    return (
        <header className={css.header}>
            <div className={css.headerContent}>
                <Link to="/" aria-label="Zur Startseite navigieren">
                    <Logo aria-hidden />
                </Link>
                <nav className={css.navigation} aria-label="Hauptnavigation">
                    <NavLink data-text="So funktioniert's" to="/">
                        So funktioniert's
                    </NavLink>
                    <NavLink data-text="Dateien teilen" to="/old">
                        Dateien teilen
                    </NavLink>
                </nav>
            </div>
        </header>
    );
}
