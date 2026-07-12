using System.Text.Json;
using backend.AccountComponent.Common.Api.DTOs;
using backend.AccountComponent.Common.Api.Exception;
using backend.AccountComponent.Dataaccess.Api.Entity;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Logic.Api;

namespace backend.AccountComponent.Logic.Impl;

public class AccountCreationHandler(IAccountRepository repo, IPasswordHasher hasher) : IAccountCreationHandler
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

        if (accountobj == null)
        {
            // the account has not been created yet

            // throw Exceptions if the username or password is invalid
            ValidateUsernameFormat(acc.DisplayName);
            ValidatePasswordFormat(acc.Password);
            
            acc.Password = hasher.HashPassword(acc.Password);

            var account = Account.Of(acc);

            var newId = await repo.SaveAsync(account);

            // Store user ID (or other data) in session
            context.Session.SetString("UserId", newId.ToString());

            return Results.Created($"/users/{newId}", new { Id = newId });
        }

        // the username is already taken
        return Results.Conflict("Username already exists.");
    }
    
    private void ValidatePasswordFormat(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 6 || password.Contains(' '))
        {
            throw new InvalidPasswordFormatException("Password must be at least 6 characters long and contain no whitespace.");
        }
    }
    
    private void ValidateUsernameFormat(string username)
    {
        if (string.IsNullOrWhiteSpace(username) || username.Length < 3 || username.Contains(' '))
        {
            throw new InvalidUsernameFormatException("Username must be at least 3 characters long and contain no whitespace.");
        }
    }
}