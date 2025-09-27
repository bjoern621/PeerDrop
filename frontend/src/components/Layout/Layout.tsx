import { Outlet } from "react-router";
import { Sidebar } from "../Sidebar/Sidebar";
import css from "./Layout.module.scss";
import { ToastContainer } from "react-toastify/unstyled";

export const Layout = () => {
    return (
        <div className={css.container}>
            <Sidebar />
            <main className={css.content}>
                <Outlet /> {}
            </main>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                pauseOnFocusLoss
                pauseOnHover
                theme="light"
                style={{
                    font: "Source Sans 3",
                    fontWeight: "bold",
                    maxHeight: "calc(100vh - 40px)",
                    scrollbarWidth: "thin",
                    scrollbarGutter: "stable",

                    overflowY: "auto",
                    overflowX: "hidden",
                    width: "100vw",
                    paddingRight: "16px",
                    right: "0px",
                }}
            />
        </div>
    );
};
