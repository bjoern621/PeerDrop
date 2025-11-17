import { Outlet } from "react-router";
import { Sidebar } from "../Sidebar/Sidebar";
import css from "./LayoutOld.module.scss";
import { ToastContainer } from "react-toastify/unstyled";
import "react-toastify/dist/ReactToastify.css";

export const LayoutOld = () => {
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
                draggable
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
