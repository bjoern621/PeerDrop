using backend.AccountComponent.Common.Api.DTOs;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Logic.Api;
using backend.AccountComponent.Logic.Impl;
using backend.tests.TestUtils;
using Microsoft.AspNetCore.Http.HttpResults;
using Moq;

namespace backend.tests.AccountComponent.Logic.Impl;

[Category("UnitTest")]
public class AccountLoginHandlerTest
{
    
    [Test]
    public async Task Login_Then_GetCurrentUser_ReturnsUser()
    {
        IPasswordHasher hasher = new PasswordHasher();
        var repo = new Mock<IAccountRepository>();
        var handler = new AccountLoginHandler(repo.Object, hasher);

        var userId = 1;
        var plainPassword = "secret";
        var accountInDb = new AccountRetrieveDto
        {
            Id = userId,
            DisplayName = "alice",
            Password = hasher.HashPassword(plainPassword)
        };

        // Setup repository for both login and user retrieval
        repo.Setup(r => r.GetByNameAsync("alice")).ReturnsAsync(accountInDb);
        repo.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(accountInDb);

        // Build the request body for login 
        var loginDto = new AccountCreateDto { DisplayName = "alice", Password = plainPassword };

        // Create a shared context with a mock session
        var context = HttpUtil.CreateMockHttpContext(loginDto);

        // Login
        var loginResult = await handler.HandleLogin(context);
        
        var okkResult = loginResult as Ok<LoginResponse>;
        Assert.That(okkResult, Is.Not.Null);
        Assert.That(okkResult.Value, Is.Not.Null);
        Assert.That(okkResult.Value.Message, Is.EqualTo("Logged in successfully"));
        
        // Get current user using same context (with preserved session)
        var userResult = await handler.HandleGetCurrentUser(context);
        var userResultS = userResult as Ok<LoginResponse>;
        
        Assert.That(userResultS, Is.Not.Null);
        Assert.That(userResultS.Value, Is.Not.Null);
        Assert.That(userResultS.Value.Message, Is.EqualTo("alice"));
    }
}