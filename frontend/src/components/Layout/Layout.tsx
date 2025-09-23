import { Outlet } from "react-router";
import { Sidebar } from "../Sidebar/Sidebar";
import css from "./Layout.module.scss";
import { ToastContainer } from "react-toastify";

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
                closeOnClick
                pauseOnFocusLoss
                pauseOnHover
                theme="light"
                style={{
                    font: "Source Sans 3",
                    fontWeight: "bold",
                }}
            />
        </div>
    );
};
