import { Outlet } from "react-router";
import Heading from "../Heading/Heading";
import Footer from "../Footer/Footer";
import "./Layout.scss";
import { ToastContainer } from "react-toastify/unstyled";

export default function Layout() {
    return (
        <div className="layout-container">
            <Heading />
            <main>
                <Outlet />
            </main>
            <Footer />
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
}
