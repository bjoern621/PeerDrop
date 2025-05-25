using System.Text.Json;
using backend.AccountCompoment.Common.DTOs;
using backend.AccountCompoment.Dataaccess.Api.Entity;
using backend.AccountCompoment.Dataaccess.Api.Repo;
using backend.AccountCompoment.Logic.Api;

namespace backend.AccountCompoment.Logic.Impl;

public class AccountHandler(IAccountRepository repo) : IAccountHandler
{
    public async Task<IResult> HandleAccounts(HttpContext context)
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

        if (accountobj == null) {
            // the account has not been created yet

            // throw Exceptions if the username or password is invalid
            Account.ValidateUsernameFormat(acc.DisplayName);
            Account.ValidatePasswordFormat(acc.Password);
    
            var account = Account.Of(acc);
    
            var newId = await repo.SaveAsync(account);
            return Results.Created($"/users/{newId}", new { Id = newId });
        }

        // the username is already taken
        return Results.StatusCode(StatusCodes.Status409Conflict);
    }
    
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

        if (accountobj == null) {
            return Results.BadRequest("Invalid username");
        }
        
        bool valid = Account.VerifyPassword(acc.Password, accountobj.Password);

        if (!valid)
            return Results.BadRequest("Invalid password");

        // Store user ID (or other data) in session
        context.Session.SetString("UserId", accountobj.Id.ToString());

        return Results.Ok(new LoginResponse("Logged in successfully"));
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
}