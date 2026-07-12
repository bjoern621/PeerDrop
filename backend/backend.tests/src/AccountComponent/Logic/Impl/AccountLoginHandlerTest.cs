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
        var tokenService = new Mock<IAuthTokenService>();
        var handler = new AccountLoginHandler(repo.Object, hasher, tokenService.Object);

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

        var context = HttpUtil.CreateMockHttpContext(loginDto);

        // Simulate the issued access token being presented on subsequent requests
        tokenService.Setup(t => t.GetAuthenticatedAccountIdAsync(context)).ReturnsAsync(userId);

        // Login
        var loginResult = await handler.HandleLogin(context);

        var okkResult = loginResult as Ok<LoginResponse>;
        Assert.That(okkResult, Is.Not.Null);
        Assert.That(okkResult.Value, Is.Not.Null);
        Assert.That(okkResult.Value.Message, Is.EqualTo("Logged in successfully"));
        tokenService.Verify(t => t.IssueTokensAsync(context, userId), Times.Once);

        // Get current user using same context
        var userResult = await handler.HandleGetCurrentUser(context);
        var userResultS = userResult as Ok<LoginResponse>;

        Assert.That(userResultS, Is.Not.Null);
        Assert.That(userResultS.Value, Is.Not.Null);
        Assert.That(userResultS.Value.Message, Is.EqualTo("alice"));
    }

    [Test]
    public async Task GetCurrentUser_WithoutValidAccessToken_ReturnsUnauthorized()
    {
        var repo = new Mock<IAccountRepository>();
        var tokenService = new Mock<IAuthTokenService>();
        var handler = new AccountLoginHandler(repo.Object, new PasswordHasher(), tokenService.Object);

        var context = HttpUtil.CreateMockHttpContext(new { });
        tokenService.Setup(t => t.GetAuthenticatedAccountIdAsync(context)).ReturnsAsync((int?)null);

        var result = await handler.HandleGetCurrentUser(context);

        Assert.That(result, Is.TypeOf<UnauthorizedHttpResult>());
    }

    [Test]
    public async Task Refresh_WithValidRefreshToken_ReturnsOk()
    {
        var repo = new Mock<IAccountRepository>();
        var tokenService = new Mock<IAuthTokenService>();
        var handler = new AccountLoginHandler(repo.Object, new PasswordHasher(), tokenService.Object);

        var context = HttpUtil.CreateMockHttpContext(new { });
        tokenService.Setup(t => t.RefreshTokensAsync(context)).ReturnsAsync(1);

        var result = await handler.HandleRefresh(context);

        Assert.That(result, Is.TypeOf<Ok<RefreshResponse>>());
    }

    [Test]
    public async Task Refresh_WithoutValidRefreshToken_ReturnsUnauthorized()
    {
        var repo = new Mock<IAccountRepository>();
        var tokenService = new Mock<IAuthTokenService>();
        var handler = new AccountLoginHandler(repo.Object, new PasswordHasher(), tokenService.Object);

        var context = HttpUtil.CreateMockHttpContext(new { });
        tokenService.Setup(t => t.RefreshTokensAsync(context)).ReturnsAsync((int?)null);

        var result = await handler.HandleRefresh(context);

        Assert.That(result, Is.TypeOf<UnauthorizedHttpResult>());
    }

    [Test]
    public async Task Logout_RevokesTokens()
    {
        var repo = new Mock<IAccountRepository>();
        var tokenService = new Mock<IAuthTokenService>();
        var handler = new AccountLoginHandler(repo.Object, new PasswordHasher(), tokenService.Object);

        var context = HttpUtil.CreateMockHttpContext(new { });

        var result = await handler.HandleLogout(context);

        Assert.That(result, Is.TypeOf<Ok<LogoutResponse>>());
        tokenService.Verify(t => t.RevokeTokensAsync(context), Times.Once);
    }
}
