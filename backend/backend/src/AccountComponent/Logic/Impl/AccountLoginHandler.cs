using System.Security.Claims;
using System.Text.Json;
using backend.AccountComponent.Common.Api.DTOs;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Logic.Api;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace backend.AccountComponent.Logic.Impl;

public class AccountLoginHandler(
    IAccountRepository repo,
    IPasswordHasher hasher,
    IAccountSignInService signIn
) : IAccountLoginHandler
{
    public async Task<IResult> HandleLogin(HttpContext context)
    {
        // Deserialize the request body
        AccountCreateDto? acc;

        try
        {
            acc = await JsonSerializer.DeserializeAsync<AccountCreateDto>(
                context.Request.Body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );
        }
        catch (Exception)
        {
            return Results.BadRequest("Invalid JSON format.");
        }

        if (acc == null)
            return Results.BadRequest("Missing account data.");

        var accountobj = await repo.GetByNameAsync(acc.DisplayName);

        if (accountobj == null)
        {
            return Results.BadRequest("Invalid username");
        }

        bool valid = hasher.VerifyPassword(acc.Password, accountobj.Password);

        if (!valid)
            return Results.BadRequest("Invalid password");

        await signIn.SignInAsync(context, accountobj.Id, accountobj.SecurityStamp);

        return Results.Ok(new LoginResponse("Logged in successfully"));
    }

    public async Task<IResult> HandleLogout(HttpContext context)
    {
        // Local logout: removes the authentication cookie
        await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Results.Ok(new LogoutResponse("Logged out successfully"));
    }

    // retrieves the current user from the authenticated principal, otherwise returns 401
    public async Task<IResult> HandleGetCurrentUser(HttpContext context)
    {
        var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out int userId))
            return Results.Unauthorized(); // Not logged in

        var user = await repo.GetByIdAsync(userId);
        if (user == null)
            return Results.Unauthorized(); // User no longer exists

        return Results.Ok(new LoginResponse(user.DisplayName));
    }

    public async Task<IResult> HandleGetLoggedInStatus(HttpContext context)
    {
        var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out int userId))
            return Results.Ok(new StatusResponse(false));

        var user = await repo.GetByIdAsync(userId);
        if (user == null)
            return Results.Ok(new StatusResponse(false));

        return Results.Ok(new StatusResponse(true));
    }
}
