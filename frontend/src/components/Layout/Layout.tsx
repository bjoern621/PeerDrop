import { Outlet, useMatches } from "react-router";
import Heading from "../Heading/Heading";
import Footer from "../Footer/Footer";
import "./Layout.scss";
import { ToastContainer } from "react-toastify/unstyled";
import {
    IconAlertTriangle as WarningIcon,
    IconInfoCircle as InfoIcon,
    IconCircleCheck as SuccessIcon,
    IconAlertCircle as ErrorIcon,
} from "@tabler/icons-react";
import { usePreventFileDropNavigation } from "../../hooks/usePreventFileDropNavigation";
import { useLanDiscoveryState } from "../../hooks/useLanDiscoveryState";

// Per-route layout options, read from the matched route's `handle`.
export type RouteHandle = {
    compactFooter?: boolean;
    /** The page fills the window and scrolls inside its own areas. */
    fullHeight?: boolean;
};

export default function Layout() {
    usePreventFileDropNavigation();
    useLanDiscoveryState();

    const matches = useMatches();
    const handles = matches.map(
        match => match.handle as RouteHandle | undefined
    );
    const compactFooter = handles.some(handle => handle?.compactFooter);
    const fullHeight = handles.some(handle => handle?.fullHeight);

    return (
        <>
            <div
                className={`layout-container ${fullHeight ? "full-height" : ""}`}
            >
                <Heading />
                <main>
                    <Outlet />
                </main>
                <Footer compact={compactFooter} />
            </div>

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
