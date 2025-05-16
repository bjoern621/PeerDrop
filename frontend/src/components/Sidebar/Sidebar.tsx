import { Register } from "./Register/Register";
import { useState } from "react";
import smallLogo from "../../assets/logo_small.png";
import css from "./Sidebar.module.scss";
import { UserProfile } from "./UserProfile/UserProfile";

export const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const login = true;

    function onCollapseSidebar() {
        setIsCollapsed(!isCollapsed);
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
                    {login ? <UserProfile /> : <Register />}
                    <img src={smallLogo} alt="Logo" className={css.logo} />
                </>
            )}
        </div>
    );
};
