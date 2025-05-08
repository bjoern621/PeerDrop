import { Register } from "./Register"
import { useState } from "react"
import smallLogo from "../../assets/logo_small.png"
import "./Sidebar.scss"

export const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    function onCollapseSidebar() {
        setIsCollapsed(!isCollapsed);
        console.log("Sidebar toggled");
    }

    return (
        <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
            <div className="sidebar-header">
                <h2>Benutzer</h2>
                <button type="button" onClick={onCollapseSidebar}>
                    {isCollapsed ? ">" : "<"}
                </button>
            </div>
            {!isCollapsed && (
                <>
                    <Register />
                    <img src={smallLogo} alt="Logo" className="logo" />
                </>
            )
            }
        </div>
    )
}