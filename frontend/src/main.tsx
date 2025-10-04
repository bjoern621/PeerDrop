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
import { DataSharingPage } from "./components/DataSharingPage/DataSharingPage.tsx";
import { ConnectionProvider } from "./context/connection/ConnectionProvider.tsx";
import Landing from "./components/Landing/Landing.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import Layout from "./components/Layout/Layout.tsx";

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
            <Route path="share" element={<DataSharingPage />} />
            <Route path="old" element={<LandingPageOld />} />
        </Route>
    )
);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider>
            <RouterProvider router={router} />
        </ThemeProvider>
    </StrictMode>
);
