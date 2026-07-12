using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using backend.AccountComponent.Dataaccess.Api.Entity;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Logic.Api;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace backend.AccountComponent.Logic.Impl;

public class AuthTokenService(IRefreshTokenRepository refreshTokenRepo) : IAuthTokenService
{
    private const string AccessTokenCookieName = "accessToken";
    private const string RefreshTokenCookieName = "refreshToken";
    private const string TokenIssuer = "PeerDrop";

    private static readonly TimeSpan AccessTokenLifetime = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(365);

    private static readonly JsonWebTokenHandler TokenHandler = new();

    private readonly string _cookieDomain =
        Environment.GetEnvironmentVariable("COOKIE_DOMAIN")
        ?? throw new ApplicationException("COOKIE_DOMAIN not set");

    private readonly SymmetricSecurityKey _signingKey = CreateSigningKey();

    private static SymmetricSecurityKey CreateSigningKey()
    {
        var secret =
            Environment.GetEnvironmentVariable("JWT_SECRET")
            ?? throw new ApplicationException("JWT_SECRET not set");

        if (secret.Length < 32)
            throw new ApplicationException("JWT_SECRET must be at least 32 characters long");

        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    }

    public async Task IssueTokensAsync(HttpContext context, int accountId)
    {
        var accessToken = CreateAccessToken(accountId);
        context.Response.Cookies.Append(
            AccessTokenCookieName,
            accessToken,
            CreateCookieOptions(context, DateTimeOffset.UtcNow.Add(AccessTokenLifetime))
        );

        // Only the hash is persisted so a database leak does not expose usable tokens
        var refreshToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var refreshExpires = DateTimeOffset.UtcNow.Add(RefreshTokenLifetime);
        await refreshTokenRepo.SaveAsync(
            new RefreshToken(HashRefreshToken(refreshToken), accountId, refreshExpires.UtcDateTime)
        );
        context.Response.Cookies.Append(
            RefreshTokenCookieName,
            refreshToken,
            CreateCookieOptions(context, refreshExpires)
        );
    }

    public async Task<int?> GetAuthenticatedAccountIdAsync(HttpContext context)
    {
        if (!context.Request.Cookies.TryGetValue(AccessTokenCookieName, out var accessToken))
            return null;

        var result = await TokenHandler.ValidateTokenAsync(
            accessToken,
            new TokenValidationParameters
            {
                ValidIssuer = TokenIssuer,
                IssuerSigningKey = _signingKey,
                ValidateAudience = false,
            }
        );

        if (!result.IsValid || result.SecurityToken is not JsonWebToken jwt)
            return null;

        if (!int.TryParse(jwt.Subject, out var accountId))
            return null;

        return accountId;
    }

    public async Task<int?> RefreshTokensAsync(HttpContext context)
    {
        if (!context.Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refreshToken))
            return null;

        var storedToken = await refreshTokenRepo.GetByHashAsync(HashRefreshToken(refreshToken));
        if (storedToken == null)
        {
            ClearAuthCookies(context);
            return null;
        }

        // Rotation: the presented token becomes invalid regardless of the outcome
        await refreshTokenRepo.DeleteByHashAsync(storedToken.GetTokenHash());

        if (storedToken.GetExpiresAt() < DateTime.UtcNow)
        {
            ClearAuthCookies(context);
            return null;
        }

        await IssueTokensAsync(context, storedToken.GetAccountId());
        return storedToken.GetAccountId();
    }

    public async Task RevokeTokensAsync(HttpContext context)
    {
        if (context.Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refreshToken))
            await refreshTokenRepo.DeleteByHashAsync(HashRefreshToken(refreshToken));

        ClearAuthCookies(context);
    }

    private string CreateAccessToken(int accountId)
    {
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = TokenIssuer,
            Subject = new ClaimsIdentity(
                [new Claim(JwtRegisteredClaimNames.Sub, accountId.ToString())]
            ),
            Expires = DateTime.UtcNow.Add(AccessTokenLifetime),
            SigningCredentials = new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256),
        };

        return TokenHandler.CreateToken(descriptor);
    }

    private static string HashRefreshToken(string refreshToken)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken)));
    }

    private CookieOptions CreateCookieOptions(HttpContext context, DateTimeOffset expires)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            IsEssential = true,
            Secure = context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Domain = _cookieDomain,
            Expires = expires,
        };
    }

    private void ClearAuthCookies(HttpContext context)
    {
        var options = CreateCookieOptions(context, DateTimeOffset.UtcNow.AddDays(-1));
        context.Response.Cookies.Delete(AccessTokenCookieName, options);
        context.Response.Cookies.Delete(RefreshTokenCookieName, options);
    }
}
