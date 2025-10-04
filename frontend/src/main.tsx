import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import { BrowserRouter, Route, Routes } from "react-router";
import { PageNotFound } from "./components/PageNotFound/PageNotFound.tsx";
import LandingPageOld from "./components/LandingPageOld/LandingPageOld.tsx";
import { Layout } from "./components/Layout/Layout.tsx";
import { DataSharingPage } from "./components/DataSharingPage/DataSharingPage.tsx";
import { ConnectionProvider } from "./context/connection/ConnectionProvider.tsx";
import Landing from "./components/Landing/Landing.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider>
            <BrowserRouter>
                <ConnectionProvider>
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route element={<Layout />}>
                            <Route path="/old" element={<LandingPageOld />} />
                            <Route
                                path="/share"
                                element={<DataSharingPage />}
                            />
                            <Route path="*" element={<PageNotFound />} />
                        </Route>
                    </Routes>
                </ConnectionProvider>
            </BrowserRouter>
        </ThemeProvider>
    </StrictMode>
);
