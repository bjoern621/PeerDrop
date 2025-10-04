import Logo from "../Logo/Logo";

export default function Heading({ children }: { children: React.ReactNode }) {
    return (
        <header>
            <Logo />
            <h1 className="text-3xl font-bold mb-4">{children}</h1>
        </header>
    );
}
