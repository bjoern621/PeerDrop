import { useThemeContext } from "../../context/ThemeContext";

export default function Landing() {
    const { setTheme } = useThemeContext();

    const toggleTheme = () => {
        const themes: ("light" | "dark" | "system")[] = [
            "light",
            "dark",
            "system",
        ];
        const randomIndex = Math.floor(Math.random() * themes.length);
        const randomTheme = themes[randomIndex];
        setTheme(randomTheme);
    };

    return (
        <div>
            <h1>Welcome to PeerDrop</h1>
            <p>This is the landing page.</p>
            <button onClick={toggleTheme}>Switch mode</button>
        </div>
    );
}
