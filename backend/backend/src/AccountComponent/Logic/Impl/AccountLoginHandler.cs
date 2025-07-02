using System.Text.Json;
using backend.AccountComponent.Common.Api.DTOs;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Logic.Api;

namespace backend.AccountComponent.Logic.Impl;

public class AccountLoginHandler(IAccountRepository repo, IPasswordHasher hasher) : IAccountLoginHandler
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

        // Store user ID (or other data) in session
        context.Session.SetString("UserId", accountobj.Id.ToString());

        return Results.Ok(new LoginResponse("Logged in successfully"));
    }

    public IResult HandleLogout(HttpContext context)
    {
        // Clear the session
        context.Session.Clear();
        // remove client-side cookie
        context.Response.Cookies.Delete(".AspNetCore.Session");
        return Results.Ok(new LogoutResponse("Logged out successfully"));
    }

    // retrieves the current user from the session if exists, otherwise returns 401
    public async Task<IResult> HandleGetCurrentUser(HttpContext context)
    {
        var userIdStr = context.Session.GetString("UserId");
        if (userIdStr == null)
            return Results.Unauthorized(); // No active session / not logged in

        if (!int.TryParse(userIdStr, out int userId))
            return Results.Unauthorized();

        var user = await repo.GetByIdAsync(userId);
        if (user == null)
            return Results.Unauthorized(); // User no longer exists

        return Results.Ok(new LoginResponse(user.DisplayName));
    }

    public async Task<IResult> HandleGetLoggedInStatus(HttpContext context)
    {
        var userIdStr = context.Session.GetString("UserId");
        if (userIdStr == null)
            return Results.Ok(new StatusResponse(false));

        if (!int.TryParse(userIdStr, out int userId))
            return Results.Ok(new StatusResponse(false));

        var user = await repo.GetByIdAsync(userId);
        if (user == null)
            return Results.Ok(new StatusResponse(false));

        return Results.Ok(new StatusResponse(true));
    }
}