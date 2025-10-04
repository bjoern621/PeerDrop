import { Outlet } from "react-router";
import Heading from "../Heading/Heading";
import Footer from "../Footer/Footer";
import css from "./Layout.module.scss";

export default function Layout() {
    return (
        <div className={css.container}>
            <Heading />
            <main>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
