import { Register } from "./Register/Register";
import { Login } from "./Login/Login";
import { useState } from "react";
import smallLogo from "../../assets/logo_small.png";
import css from "./Sidebar.module.scss";
import { UserProfile } from "./UserProfile/UserProfile";

export const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);

    function onCollapseSidebar() {
        setIsCollapsed(!isCollapsed);
    }

    function toggleLoginRegister() {
        setShowLogin(!showLogin);
    }

    function onLogin() {
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
                    <img src={smallLogo} alt="Logo" className={css.logo} />
                </>
            )}
        </div>
    );
};
