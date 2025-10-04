import Hero from "./Hero/Hero";
import css from "./Landing.module.scss";
import Tutorial from "./Tutorial/Tutorial";
import UnderTheHood from "./UnderTheHood/UnderTheHood";
import Why from "./Why/Why";

export default function Landing() {
    return (
        <div className={css.container}>
            <Hero />
            <Tutorial />
            <Why />
            <UnderTheHood />
        </div>
    );
}
