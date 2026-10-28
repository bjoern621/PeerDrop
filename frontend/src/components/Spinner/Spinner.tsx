import { IconLoader as LoaderIcon } from "@tabler/icons-react";
import css from "./Spinner.module.scss";
import PopIn from "../PopIn/PopIn";
import { cx } from "class-variance-authority";

/** Turning loader icon in the current text color, shown and hidden like PopIn. */
export default function Spinner({
    visible = true,
    className,
}: {
    visible?: boolean;
    className?: string;
}) {
    return (
        <PopIn visible={visible} className={cx(css.spinner, className)}>
            <LoaderIcon />
        </PopIn>
    );
}
