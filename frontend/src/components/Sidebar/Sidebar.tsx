import { Register } from "./Register/Register";
import { Login } from "./Login/Login";
import { useEffect, useState } from "react";
import smallLogo from "../../assets/logo_small.png";
import leftArrowIcon from "../../assets/left_arrow.svg";
import rightArrowIcon from "../../assets/right_arrow.svg";
import css from "./Sidebar.module.scss";
import { UserProfile } from "./UserProfile/UserProfile";
import errorAsValue from "../../util/ErrorAsValue";
import { StatusResponse } from "../../util/dtos/StatusResponse";
import { assert } from "../../util/Assert";
import { useResetWebsocket } from "../../context/ResetContext";
import { toast } from "react-toastify/unstyled";

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
            toast.error(
                "Fehler beim Abrufen des Login-Status. Bitte versuche es später erneut."
            );
            return false;
        }

        if (!response.ok) {
            toast.error(
                "Fehler beim Abrufen des Login-Status. Bitte versuche es später erneut."
            );
            return false;
        }

        const [responseBody, parseError] = await errorAsValue(response.json());

        if (parseError) {
            toast.error(
                "Fehler beim Abrufen des Login-Status. Bitte versuche es später erneut."
            );
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
            <div>
                <div className={css.sidebarHeader}>
                    {!isCollapsed ? <h2>Benutzer</h2> : <></>}
                    <button
                        type="button"
                        onClick={onCollapseSidebar}
                        className={css.collapseButton}
                    >
                        {isCollapsed ? (
                            <img
                                src={rightArrowIcon}
                                alt="Expand Sidebar"
                                className={css.arrowIcon}
                            />
                        ) : (
                            <img
                                src={leftArrowIcon}
                                alt="Collapse Sidebar"
                                className={css.arrowIcon}
                            />
                        )}
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
                    </>
                )}
            </div>

            {!isCollapsed && (
                <>
                    <div>
                        <img src={smallLogo} alt="Logo" className={css.logo} />
                        <div className={css.versionText}>
                            Build: {import.meta.env.VITE_APP_VERSION}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
