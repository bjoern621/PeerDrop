import BannerLogo from "../../assets/logo/logo_banner.svg?react";
import IconLogo from "../../assets/logo/logo_icon.svg?react";
import css from "./Logo.module.scss";
import { ComponentPropsWithoutRef } from "react";

type LogoProps = Omit<
    ComponentPropsWithoutRef<typeof BannerLogo>,
    "className"
> & {
    className?: string;
};

export default function Logo({ className, ...props }: LogoProps) {
    return (
        <BannerLogo className={`${css.logo} ${className || ""}`} {...props} />
    );
}

/** Shows the paper clip without the name, for narrow screens. */
export function LogoIcon({ className, ...props }: LogoProps) {
    return <IconLogo className={`${css.logo} ${className || ""}`} {...props} />;
}
