using System.Text.Json;
using backend.AccountCompoment.Common.DTOs;
using backend.AccountCompoment.Dataaccess.Api.Entity;
using backend.AccountCompoment.Dataaccess.Impl;
using backend.AccountCompoment.Logic.Api;
using Microsoft.AspNetCore.Mvc;

namespace backend.AccountCompoment.Logic.Impl;

public class AccountHandler : IAccountHandler
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
        
        var repo = new AccountRepository();
        var accountobj = await repo.GetByNameAsync(acc.DisplayName);

        if (accountobj == null) {
            // the account has not been created yet

            // throw Exceptions if the username or password is invalid
            Account.ValidateUsernameFormat(acc.DisplayName);
            Account.ValidatePasswordFormat(acc.Password);
    
            var account = Account.of(acc);
    
            var newId = await repo.SaveAsync(account);
            return Results.Created($"/users/{newId}", new { Id = newId });
        }

        // the username is already taken
        return Results.StatusCode(StatusCodes.Status409Conflict);
    }
}