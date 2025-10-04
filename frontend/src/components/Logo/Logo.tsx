import BannerLogo from "../../assets/logo_banner.svg";
import css from "./Logo.module.scss";

export default function Logo() {
    return (
        <div className={css.logo}>
            <BannerLogo />
        </div>
    );
}
