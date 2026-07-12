namespace backend.AccountComponent.Logic.Api;

public interface IAuthTokenService
{
    /// <summary>
    /// Creates a short-lived access token and a long-lived refresh token for the account and
    /// attaches both as httpOnly cookies to the response. The refresh token is persisted
    /// server-side (hashed) so it can be revoked.
    /// </summary>
    Task IssueTokensAsync(HttpContext context, int accountId);

    /// <summary>
    /// Validates the access token cookie and returns the account id it was issued for,
    /// or null if the cookie is missing, invalid or expired.
    /// </summary>
    Task<int?> GetAuthenticatedAccountIdAsync(HttpContext context);

    /// <summary>
    /// Validates the refresh token cookie against the server-side store, rotates it
    /// (the presented token is invalidated) and issues a new token pair.
    /// Returns the account id, or null if the refresh token is missing, unknown or expired.
    /// </summary>
    Task<int?> RefreshTokensAsync(HttpContext context);

    /// <summary>
    /// Revokes the refresh token server-side and clears the auth cookies.
    /// </summary>
    Task RevokeTokensAsync(HttpContext context);
}
