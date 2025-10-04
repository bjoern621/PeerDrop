import { NavLink } from "react-router";
import Logo from "../Logo/Logo";
import css from "./Heading.module.scss";

export default function Heading() {
    return (
        <header className={css.header}>
            <Logo />
            <div className={css.navigation}>
                <NavLink data-text="So funktioniert's" to="/">
                    So funktioniert's
                </NavLink>
                <NavLink data-text="Dateien teilen" to="/old">
                    Dateien teilen
                </NavLink>
            </div>
        </header>
    );
}
