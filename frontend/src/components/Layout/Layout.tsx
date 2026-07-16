import { Outlet } from "react-router";
import Heading from "../Heading/Heading";
import Footer from "../Footer/Footer";
import "./Layout.scss";
import { ToastContainer } from "react-toastify/unstyled";
import WarningIcon from "../../assets/status/icons8-error-3.svg?react";
import InfoIcon from "../../assets/status/icons8-info-3.svg?react";
import SuccessIcon from "../../assets/status/icons8-check-mark-3.svg?react";
import ErrorIcon from "../../assets/status/icons8-high-priority-3.svg?react";
import ConnectionOverlay from "../ConnectionOverlay/ConnectionOverlay";
import { usePreventFileDropNavigation } from "../../hooks/usePreventFileDropNavigation";

export default function Layout() {
    usePreventFileDropNavigation();

    return (
        <>
            <div className="layout-container">
                <Heading />
                <main>
                    <Outlet />
                </main>
                <Footer />
            </div>

            <ConnectionOverlay />

            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                pauseOnFocusLoss
                pauseOnHover
                theme="colored"
                icon={({ type }) => {
                    const icons = {
                        warning: WarningIcon,
                        info: InfoIcon,
                        success: SuccessIcon,
                        error: ErrorIcon,
                    };
                    const Icon = icons[type as keyof typeof icons];
                    return Icon ? <Icon /> : undefined;
                }}
            />
        </>
    );
}
