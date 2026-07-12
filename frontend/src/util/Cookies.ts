/**
 * Typed read/write access to document.cookie.
 */

/**
 * Returns the decoded value of the cookie with the given name,
 * or undefined when the cookie is not set.
 */
export function getCookie(name: string): string | undefined {
    const prefix = `${name}=`;
    const row = document.cookie
        .split("; ")
        .find(row => row.startsWith(prefix));
    return row ? decodeURIComponent(row.slice(prefix.length)) : undefined;
}

/**
 * Writes a cookie for the whole site (path=/) with the given lifetime.
 * The value is URI-encoded.
 */
export function setCookie(name: string, value: string, maxAgeDays: number) {
    const maxAgeSeconds = Math.floor(maxAgeDays * 24 * 60 * 60);
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}
