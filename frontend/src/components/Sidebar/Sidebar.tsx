import { Register } from "./Register/Register";
import { Login } from "./Login/Login";
import { useEffect, useState } from "react";
import smallLogo from "../../assets/logo_small.png";
import css from "./Sidebar.module.scss";
import { UserProfile } from "./UserProfile/UserProfile";
import errorAsValue from "../../util/ErrorAsValue";
import { StatusResponse } from "../dtos/StatusResponse";
import { assert } from "../../util/Assert";
import { useResetWebsocket } from "../../context/ResetContext";

export const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [showLogin, setShowLogin] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);

    const resetWebsocketConnection = useResetWebsocket();

    const getLoggedInStatus = async () => {
        const [response, err] = await errorAsValue(
            fetch(`${import.meta.env.VITE_BACKEND_URL}/me/status`, {
                method: "GET",
                credentials: "include",
            })
        );

        if (err) {
            console.error("Fehler beim Abrufen des Login-Status:", err);
            return false;
        }

        if (!response.ok) {
            console.error(
                "Fehler beim Abrufen des Login-Status:",
                response.statusText
            );
            return false;
        }

        const [responseBody, parseError] = await errorAsValue(response.json());

        if (parseError) {
            console.error("Fehler beim Parsen der Antwort:", parseError);
            return false;
        }

        const statusData = responseBody as StatusResponse;
        assert(
            statusData && typeof statusData.status === "boolean",
            "Invalid user status response"
        );

        return statusData.status;
    };

    useEffect(() => {
        void getLoggedInStatus().then(loggedIn => {
            setLoggedIn(loggedIn);
            if (loggedIn) {
                // Has to be done like this, otherwise the sidebar
                // automatically re-collapses if the user is not logged in
                setIsCollapsed(false);
            }
        });
    }, []);

    function onCollapseSidebar() {
        setIsCollapsed(!isCollapsed);
    }

    function toggleLoginRegister() {
        setShowLogin(!showLogin);
    }

    function onLogin() {
        resetWebsocketConnection();
        setLoggedIn(true);
    }

    return (
        <div className={isCollapsed ? css.collapsed : css.expanded}>
            <div className={css.sidebarHeader}>
                {!isCollapsed ? <h2>Benutzer</h2> : <></>}
                <button
                    type="button"
                    onClick={onCollapseSidebar}
                    className={css.collapseButton}
                >
                    {isCollapsed ? ">" : "<"}
                </button>
            </div>
            {!isCollapsed && (
                <>
                    {loggedIn ? (
                        <UserProfile />
                    ) : showLogin ? (
                        <Login
                            onSwitchToRegister={toggleLoginRegister}
                            onLogin={onLogin}
                        />
                    ) : (
                        <Register
                            onSwitchToLogin={toggleLoginRegister}
                            onLogin={onLogin}
                        />
                    )}
                    <img
                        src={smallLogo}
                        alt="Logo"
                        className={css.logo}
                        loading="eager"
                    />
                </>
            )}
        </div>
    );
};
