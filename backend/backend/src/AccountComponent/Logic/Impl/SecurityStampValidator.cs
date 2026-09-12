using System.Security.Claims;
using backend.AccountComponent.Common.Api;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Logic.Api;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace backend.AccountComponent.Logic.Impl;

public class SecurityStampValidator(IAccountRepository repo) : ISecurityStampValidator
{
    public async Task ValidateAsync(CookieValidatePrincipalContext context)
    {
        var idClaim = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        var stampClaim = context.Principal?.FindFirstValue(AuthClaims.SecurityStamp);

        if (!int.TryParse(idClaim, out var accountId) || !Guid.TryParse(stampClaim, out var stamp))
        {
            await RejectAsync(context);
            return;
        }

        var account = await repo.GetByIdAsync(accountId);
        if (account == null || account.SecurityStamp != stamp)
            await RejectAsync(context);
    }

    private static async Task RejectAsync(CookieValidatePrincipalContext context)
    {
        context.RejectPrincipal();
        await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    }
}
