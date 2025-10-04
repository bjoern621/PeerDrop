import { useThemeContext } from "../../context/ThemeContext";

export default function Landing() {
    const { theme, setTheme } = useThemeContext();

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    return (
        <div>
            <h1>Welcome to PeerDrop</h1>
            <p>This is the landing page.</p>
            <button onClick={toggleTheme}>
                Switch to {theme === "light" ? "dark" : "light"} mode
            </button>
        </div>
    );
}
