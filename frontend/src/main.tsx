import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
    RouterProvider,
} from "react-router";
import { PageNotFound } from "./components/PageNotFound/PageNotFound.tsx";
import { WorkInProgress } from "./components/WorkInProgress/WorkInProgress.tsx";
import { ConnectionProvider } from "./context/connection/ConnectionProvider.tsx";
import Landing from "./components/Landing/Landing.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import Layout from "./components/Layout/Layout.tsx";
import Sharing from "./components/Sharing/Sharing.tsx";
import Connection from "./components/Connection/Connection.tsx";
import { loadRuntimeEnvVars } from "./util/RuntimeEnvVars.ts";

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
            <Route path="share" element={<Sharing />} />
            <Route path="connect" element={<Connection />} />
            <Route path="connect/:token" element={<Connection />} />
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
                    <RouterProvider router={router} />
                </AuthProvider>
            </ThemeProvider>
        </StrictMode>
    );
});
