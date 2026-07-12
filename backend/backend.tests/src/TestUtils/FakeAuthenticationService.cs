using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;

namespace backend.tests.TestUtils;

/// <summary>
/// In-memory IAuthenticationService for unit tests. SignInAsync assigns the principal
/// to HttpContext.User instead of issuing a cookie, SignOutAsync resets it.
/// </summary>
public class FakeAuthenticationService : IAuthenticationService
{
    public ClaimsPrincipal? SignedInPrincipal { get; private set; }
    public bool SignedOut { get; private set; }

    public Task<AuthenticateResult> AuthenticateAsync(HttpContext context, string? scheme) =>
        Task.FromResult(AuthenticateResult.NoResult());

    public Task ChallengeAsync(HttpContext context, string? scheme, AuthenticationProperties? properties) =>
        Task.CompletedTask;

    public Task ForbidAsync(HttpContext context, string? scheme, AuthenticationProperties? properties) =>
        Task.CompletedTask;

    public Task SignInAsync(HttpContext context, string? scheme, ClaimsPrincipal principal,
        AuthenticationProperties? properties)
    {
        SignedInPrincipal = principal;
        context.User = principal;
        return Task.CompletedTask;
    }

    public Task SignOutAsync(HttpContext context, string? scheme, AuthenticationProperties? properties)
    {
        SignedOut = true;
        context.User = new ClaimsPrincipal(new ClaimsIdentity());
        return Task.CompletedTask;
    }
}
