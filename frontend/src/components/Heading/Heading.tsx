import { useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { IconMenu2 as MenuIcon, IconX as CloseIcon } from "@tabler/icons-react";
import Logo from "../Logo/Logo";
import css from "./Heading.module.scss";
import StableText from "../StableText/StableText";
import AuthButton from "../Auth/AuthButton";
import SettingsMenu from "../SettingsMenu/SettingsMenu";
import { LanguageFlagButton } from "../LanguageToggle/LanguageToggle";
import IconButton from "../IconButton/IconButton";

/**
 * On narrow screens, navigation and account controls sit in a popover menu
 * opened from the right. On wide screens, the popover stays closed and shows
 * its content inline.
 */
export default function Heading() {
    const { t } = useTranslation();
    const menuRef = useRef<HTMLDivElement>(null!);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const closeMenu = () => {
        if (menuRef.current.matches(":popover-open")) {
            menuRef.current.hidePopover();
        }
    };

    return (
        <header className={css.header}>
            <div className={css.headerContent}>
                <Link to="/" aria-label={t("header.homeLink")}>
                    <Logo aria-hidden />
                </Link>

                <IconButton
                    className={css.menuButton}
                    label={t("header.menu")}
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
                <nav
                    className={css.navigation}
                    aria-label={t("header.navigation")}
                >
                    <NavLink
                        to="/"
                        aria-label={t("header.howItWorksLink")}
                        onClick={closeMenu}
                    >
                        <StableText
                            text={t("header.howItWorks")}
                            fontWeight={"var(--font-weight-semibold)"}
                        />
                    </NavLink>
                    <NavLink
                        to="/connect"
                        aria-label={t("header.shareLink")}
                        onClick={closeMenu}
                    >
                        <StableText
                            text={t("header.share")}
                            fontWeight={"var(--font-weight-semibold)"}
                        />
                    </NavLink>
                </nav>

                <div className={css.authSection}>
                    <LanguageFlagButton />
                    <SettingsMenu />
                    <AuthButton />
                </div>
            </div>
        </header>
    );
}
