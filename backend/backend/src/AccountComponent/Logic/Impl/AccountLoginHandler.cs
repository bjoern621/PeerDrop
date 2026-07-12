using System.Text.Json;
using backend.AccountComponent.Common.Api.DTOs;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Logic.Api;

namespace backend.AccountComponent.Logic.Impl;

public class AccountLoginHandler(
    IAccountRepository repo,
    IPasswordHasher hasher,
    IAuthTokenService tokenService
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

        await tokenService.IssueTokensAsync(context, accountobj.Id);

        return Results.Ok(new LoginResponse("Logged in successfully"));
    }

    public async Task<IResult> HandleLogout(HttpContext context)
    {
        await tokenService.RevokeTokensAsync(context);
        return Results.Ok(new LogoutResponse("Logged out successfully"));
    }

    // Issues a new token pair from the refresh token cookie, or returns 401
    public async Task<IResult> HandleRefresh(HttpContext context)
    {
        var accountId = await tokenService.RefreshTokensAsync(context);
        if (accountId == null)
            return Results.Unauthorized();

        return Results.Ok(new RefreshResponse("Tokens refreshed successfully"));
    }

    // retrieves the current user from the access token if valid, otherwise returns 401
    public async Task<IResult> HandleGetCurrentUser(HttpContext context)
    {
        var accountId = await tokenService.GetAuthenticatedAccountIdAsync(context);
        if (accountId == null)
            return Results.Unauthorized(); // No valid access token / not logged in

        var user = await repo.GetByIdAsync(accountId.Value);
        if (user == null)
            return Results.Unauthorized(); // User no longer exists

        return Results.Ok(new LoginResponse(user.DisplayName));
    }

    public async Task<IResult> HandleGetLoggedInStatus(HttpContext context)
    {
        var accountId = await tokenService.GetAuthenticatedAccountIdAsync(context);
        if (accountId == null)
            return Results.Ok(new StatusResponse(false));

        var user = await repo.GetByIdAsync(accountId.Value);
        if (user == null)
            return Results.Ok(new StatusResponse(false));

        return Results.Ok(new StatusResponse(true));
    }
}
