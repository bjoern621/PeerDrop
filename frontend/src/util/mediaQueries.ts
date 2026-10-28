import breakpoints from "../theme/breakpoints.module.scss";

/** Cards stack as full-width sections. */
export const PHONE_QUERY = `(width <= ${breakpoints.phone})`;
/** The activity list runs below both dashboard columns. */
export const COMPACT_QUERY = `(${breakpoints.phone} < width < ${breakpoints.compact})`;
/** Header controls move into the popover menu. */
export const HEADER_MENU_QUERY = `(width <= ${breakpoints.headerMenu})`;
export const COARSE_POINTER_QUERY = "(pointer: coarse)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)";
