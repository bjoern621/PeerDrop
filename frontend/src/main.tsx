import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import "./i18n/i18n.ts";
import {
    createBrowserRouter,
    createRoutesFromElements,
    Navigate,
    Route,
    RouterProvider,
} from "react-router";
import { PageNotFound } from "./components/PageNotFound/PageNotFound.tsx";
import { WorkInProgress } from "./components/WorkInProgress/WorkInProgress.tsx";
import { ConnectionProvider } from "./context/connection/ConnectionProvider.tsx";
import Landing from "./components/Landing/Landing.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import Layout, { RouteHandle } from "./components/Layout/Layout.tsx";
import Dashboard from "./components/Dashboard/Dashboard.tsx";
import { loadRuntimeEnvVars } from "./util/RuntimeEnvVars.ts";
import { SettingsDialogProvider } from "./context/SettingsDialogContext.tsx";

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route
            path="/"
            element={
                <ConnectionProvider>
                    <Layout />
                </ConnectionProvider>
            }
            errorElement={<PageNotFound />}
        >
            <Route path="/" element={<Landing />} />
            <Route path="share" element={<Navigate to="/connect" replace />} />
            <Route
                path="connect"
                element={<Dashboard />}
                handle={
                    {
                        compactFooter: true,
                        fullHeight: true,
                    } satisfies RouteHandle
                }
            />
            <Route path="faq" element={<WorkInProgress />} />
            <Route path="inside" element={<WorkInProgress />} />
        </Route>
    )
);

void loadRuntimeEnvVars().then(() => {
    createRoot(document.getElementById("root")!).render(
        <StrictMode>
            <ThemeProvider>
                <AuthProvider>
                    <SettingsDialogProvider>
                        <RouterProvider router={router} />
                    </SettingsDialogProvider>
                </AuthProvider>
            </ThemeProvider>
        </StrictMode>
    );
});
