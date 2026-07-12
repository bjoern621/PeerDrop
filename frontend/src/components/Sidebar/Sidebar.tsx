import { Register } from "./Register/Register";
import { Login } from "./Login/Login";
import { useEffect, useState } from "react";
import smallLogo from "../../assets/logo/logo_small.png";
import leftArrowIcon from "../../assets/left_arrow.svg";
import rightArrowIcon from "../../assets/right_arrow.svg";
import css from "./Sidebar.module.scss";
import { UserProfile } from "./UserProfile/UserProfile";
import { useResetWebsocket } from "../../context/connection/ResetContext";
import { AuthService } from "../../services/AuthService";

export const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [showLogin, setShowLogin] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);

    const resetWebsocketConnection = useResetWebsocket();

    useEffect(() => {
        void AuthService.getLoggedInStatus().then(loggedIn => {
            setLoggedIn(loggedIn);
            if (loggedIn) {
                // Has to be done like this, otherwise the sidebar
                // automatically re-collapses if the user is not logged in
                setIsCollapsed(false);

                if (AuthService.hasRefreshedTokens()) {
                    // The websocket connected before the tokens were refreshed;
                    // reconnect so the server can associate it with the account
                    resetWebsocketConnection();
                }
            }
        });
        // The status check must run exactly once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
