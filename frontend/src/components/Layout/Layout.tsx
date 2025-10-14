import { Outlet } from "react-router";
import Heading from "../Heading/Heading";
import Footer from "../Footer/Footer";
import "./Layout.scss";

export default function Layout() {
    return (
        <div className="layout-container">
            <Heading />
            <main>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
