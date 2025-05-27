import { Outlet } from "react-router";
import { Sidebar } from "../Sidebar/Sidebar";
import css from "./Layout.module.scss";

export const Layout = () => {
    return (
        <div className={css.container}>
            <Sidebar />
            <main className={css.content}>
                <Outlet /> { }
            </main>
        </div>
    );
};
