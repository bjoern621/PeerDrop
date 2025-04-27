import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import App from "./components/App/App.tsx";
import { BrowserRouter, Route, Routes } from "react-router";
import { PageNotFound } from "./components/PageNotFound/PageNotFound.tsx";
import { CSSModulesExamples } from "./components/CSSModulesExample/CSSModulesExamples.tsx";
import { Fetch } from "./components/Fetch/Fetch.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<PageNotFound />} />
                <Route path="app" element={<App />} />
                <Route
                    path="/module-example"
                    element={<CSSModulesExamples />}
                />
                <Route path="/fetch" element={<Fetch />} />
                <Route path="*" element={<PageNotFound />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>
);
