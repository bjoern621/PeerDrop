import BannerLogo from "../../assets/logo_banner.svg?react";
import css from "./Logo.module.scss";

export default function Logo() {
    return <BannerLogo className={css.logo} />;
}
