import bannerLogoImg from "../../assets/banner-logo.png";
import css from "./Logo.module.scss";

export default function Logo() {
    return (
        <img
            src={bannerLogoImg}
            className={css.logo}
            alt="Banner Logo von PeerDrop"
            loading="eager"
        />
    );
}
