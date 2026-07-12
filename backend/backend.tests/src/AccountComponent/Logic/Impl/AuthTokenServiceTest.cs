using backend.AccountComponent.Dataaccess.Api.Entity;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Logic.Impl;
using Microsoft.AspNetCore.Http;
using Moq;

namespace backend.tests.AccountComponent.Logic.Impl;

[Category("UnitTest")]
public class AuthTokenServiceTest
{
    private Dictionary<string, RefreshToken> _tokenStore;
    private AuthTokenService _tokenService;

    [SetUp]
    public void SetUp()
    {
        _tokenStore = new Dictionary<string, RefreshToken>();

        var repoMock = new Mock<IRefreshTokenRepository>();
        repoMock.Setup(r => r.SaveAsync(It.IsAny<RefreshToken>()))
            .Callback<RefreshToken>(token => _tokenStore[token.GetTokenHash()] = token)
            .Returns(Task.CompletedTask);
        repoMock.Setup(r => r.GetByHashAsync(It.IsAny<string>()))
            .ReturnsAsync((string hash) => _tokenStore.GetValueOrDefault(hash));
        repoMock.Setup(r => r.DeleteByHashAsync(It.IsAny<string>()))
            .ReturnsAsync((string hash) => _tokenStore.Remove(hash) ? 1 : 0);

        _tokenService = new AuthTokenService(repoMock.Object);
    }

    /// <summary>
    /// Builds a request context that carries the cookies set on the given response,
    /// simulating the browser sending them back.
    /// </summary>
    private static HttpContext CreateFollowUpRequest(HttpContext previousResponse)
    {
        var cookiePairs = previousResponse.Response.Headers.SetCookie
            .Select(header => header!.Split(';')[0]);

        var context = new DefaultHttpContext();
        context.Request.Headers.Cookie = string.Join("; ", cookiePairs);
        return context;
    }

    [Test]
    public async Task IssueTokens_Then_AccessTokenAuthenticates()
    {
        var loginContext = new DefaultHttpContext();
        await _tokenService.IssueTokensAsync(loginContext, 42);

        var nextRequest = CreateFollowUpRequest(loginContext);
        var accountId = await _tokenService.GetAuthenticatedAccountIdAsync(nextRequest);

        Assert.That(accountId, Is.EqualTo(42));
    }

    [Test]
    public async Task IssueTokens_PersistsHashedRefreshToken()
    {
        var loginContext = new DefaultHttpContext();
        await _tokenService.IssueTokensAsync(loginContext, 42);

        var refreshCookie = loginContext.Response.Headers.SetCookie
            .Single(header => header!.StartsWith("refreshToken="))!
            .Split(';')[0]["refreshToken=".Length..];

        Assert.That(_tokenStore, Has.Count.EqualTo(1));
        Assert.That(_tokenStore.Values.Single().GetAccountId(), Is.EqualTo(42));
        // The stored value must be a hash, not the plain token
        Assert.That(_tokenStore.Keys.Single(), Is.Not.EqualTo(refreshCookie));
    }

    [Test]
    public async Task GetAuthenticatedAccountId_WithoutCookie_ReturnsNull()
    {
        var context = new DefaultHttpContext();
        var accountId = await _tokenService.GetAuthenticatedAccountIdAsync(context);

        Assert.That(accountId, Is.Null);
    }

    [Test]
    public async Task GetAuthenticatedAccountId_WithGarbageToken_ReturnsNull()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers.Cookie = "accessToken=not-a-jwt";

        var accountId = await _tokenService.GetAuthenticatedAccountIdAsync(context);

        Assert.That(accountId, Is.Null);
    }

    [Test]
    public async Task RefreshTokens_IssuesNewTokensAndInvalidatesOldRefreshToken()
    {
        var loginContext = new DefaultHttpContext();
        await _tokenService.IssueTokensAsync(loginContext, 42);

        var refreshContext = CreateFollowUpRequest(loginContext);
        var accountId = await _tokenService.RefreshTokensAsync(refreshContext);

        Assert.That(accountId, Is.EqualTo(42));

        // The new access token authenticates
        var nextRequest = CreateFollowUpRequest(refreshContext);
        Assert.That(await _tokenService.GetAuthenticatedAccountIdAsync(nextRequest), Is.EqualTo(42));

        // Rotation: replaying the old refresh token fails
        var replayContext = CreateFollowUpRequest(loginContext);
        Assert.That(await _tokenService.RefreshTokensAsync(replayContext), Is.Null);
    }

    [Test]
    public async Task RefreshTokens_WithoutCookie_ReturnsNull()
    {
        var context = new DefaultHttpContext();
        var accountId = await _tokenService.RefreshTokensAsync(context);

        Assert.That(accountId, Is.Null);
    }

    [Test]
    public async Task RevokeTokens_DeletesRefreshTokenServerSide()
    {
        var loginContext = new DefaultHttpContext();
        await _tokenService.IssueTokensAsync(loginContext, 42);

        var logoutContext = CreateFollowUpRequest(loginContext);
        await _tokenService.RevokeTokensAsync(logoutContext);

        Assert.That(_tokenStore, Is.Empty);

        // The revoked refresh token no longer refreshes
        var replayContext = CreateFollowUpRequest(loginContext);
        Assert.That(await _tokenService.RefreshTokensAsync(replayContext), Is.Null);
    }
}
