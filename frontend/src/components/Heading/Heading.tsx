import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { IconMenu2 as MenuIcon, IconX as CloseIcon } from "@tabler/icons-react";
import Logo, { LogoIcon } from "../Logo/Logo";
import css from "./Heading.module.scss";
import StableText from "../StableText/StableText";
import AuthButton from "../Auth/AuthButton";
import SettingsMenu from "../SettingsMenu/SettingsMenu";
import LanguageToggle, {
    LanguageFlagButton,
} from "../LanguageToggle/LanguageToggle";
import IconButton from "../IconButton/IconButton";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { HEADER_MENU_QUERY } from "../../util/mediaQueries";
import { cx } from "class-variance-authority";

/**
 * On narrow screens, language, settings and account controls sit in a popover
 * menu opened from the right, as a list with their names spelled out. On wide
 * screens, the popover stays closed and shows its content inline as icons.
 */
export default function Heading() {
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isMenuLayout = useMediaQuery(HEADER_MENU_QUERY);
    const menuRef = useRef<HTMLDivElement>(null!);

    // An open popover stays in the top layer and leaves the wide header empty.
    useEffect(() => {
        if (!isMenuLayout && menuRef.current.matches(":popover-open")) {
            menuRef.current.hidePopover();
        }
    }, [isMenuLayout]);

    return (
        <header className={css.header}>
            <div className={css.headerContent}>
                <Link to="/" aria-label={t("header.homeLink")}>
                    <Logo className={css.bannerLogo} aria-hidden />
                    <LogoIcon className={css.iconLogo} aria-hidden />
                </Link>

                <nav
                    className={css.navigation}
                    aria-label={t("header.navigation")}
                >
                    <NavLink to="/" aria-label={t("header.howItWorksLink")}>
                        <StableText
                            text={t("header.howItWorks")}
                            fontWeight={"var(--font-weight-semibold)"}
                        />
                    </NavLink>
                    <NavLink to="/connect" aria-label={t("header.shareLink")}>
                        <StableText
                            text={t("header.share")}
                            fontWeight={"var(--font-weight-semibold)"}
                        />
                    </NavLink>
                </nav>

                <IconButton
                    className={cx(css.menuButton, isMenuOpen && css.open)}
                    label={t("header.menu")}
                    tooltip={false}
                    popoverTarget="header-menu"
                >
                    {isMenuOpen ? (
                        <CloseIcon aria-hidden />
                    ) : (
                        <MenuIcon aria-hidden />
                    )}
                </IconButton>
            </div>

            <div
                ref={menuRef}
                id="header-menu"
                className={css.menu}
                popover="auto"
                onToggle={event => {
                    // React bubbles the toggle events of the dialogs inside.
                    if (event.target === event.currentTarget) {
                        setIsMenuOpen(event.newState === "open");
                    }
                }}
            >
                <ul className={css.authSection}>
                    <li>
                        {isMenuLayout ? (
                            <LanguageToggle className={css.menuItem} />
                        ) : (
                            <LanguageFlagButton />
                        )}
                    </li>
                    <li>
                        <SettingsMenu
                            labelled={isMenuLayout}
                            labelClassName={css.menuItem}
                        />
                    </li>
                    <li>
                        <AuthButton />
                    </li>
                </ul>
            </div>
        </header>
    );
}
