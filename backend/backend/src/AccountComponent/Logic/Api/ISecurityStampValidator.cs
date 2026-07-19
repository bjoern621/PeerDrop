using Microsoft.AspNetCore.Authentication.Cookies;

namespace backend.AccountComponent.Logic.Api;

public interface ISecurityStampValidator
{
    /// <summary>
    /// Validates the security stamp claim of an incoming cookie principal against the database.
    /// Rejects the principal and signs the client out when the account no longer exists
    /// or the stamp has been rotated.
    /// </summary>
    Task ValidateAsync(CookieValidatePrincipalContext context);
}
