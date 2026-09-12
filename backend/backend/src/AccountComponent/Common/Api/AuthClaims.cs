namespace backend.AccountComponent.Common.Api;

/// <summary>
/// Claim types stored in the authentication cookie in addition to the standard claims.
/// </summary>
public static class AuthClaims
{
    /// <summary>
    /// The account's security stamp at sign-in time. Compared against the database
    /// on every request; a mismatch invalidates the cookie.
    /// </summary>
    public const string SecurityStamp = "peerdrop:security_stamp";
}
