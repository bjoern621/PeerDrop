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
import LandingPageOld from "./components/LandingPageOld/LandingPageOld.tsx";
import { ConnectionProvider } from "./context/connection/ConnectionProvider.tsx";
import Landing from "./components/Landing/Landing.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import Layout from "./components/Layout/Layout.tsx";
import Sharing from "./components/Sharing/Sharing.tsx";
import Connection from "./components/Connection/Connection.tsx";

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
            <Route path="old" element={<LandingPageOld />} />
            <Route path="connect" element={<Connection />} />
        </Route>
    )
);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </ThemeProvider>
    </StrictMode>
);
