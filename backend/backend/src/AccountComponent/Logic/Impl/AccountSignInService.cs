using System.Security.Claims;
using backend.AccountComponent.Common.Api;
using backend.AccountComponent.Logic.Api;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace backend.AccountComponent.Logic.Impl;

public class AccountSignInService : IAccountSignInService
{
    public async Task SignInAsync(HttpContext context, int accountId, Guid securityStamp)
    {
        var identity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, accountId.ToString()),
                new Claim(AuthClaims.SecurityStamp, securityStamp.ToString()),
            ],
            CookieAuthenticationDefaults.AuthenticationScheme
        );

        await context.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true }
        );
    }
}
