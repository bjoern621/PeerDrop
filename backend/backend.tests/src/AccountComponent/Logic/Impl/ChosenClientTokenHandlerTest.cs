using backend.AccountComponent.Common.Api.DTOs;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Logic.Impl;
using backend.tests.TestUtils;
using backend.WebSocketComponent.Logic.Api;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Moq;

namespace backend.tests.AccountComponent.Logic.Impl;

[Category("UnitTest")]
public class ChosenClientTokenHandlerTest
{
    private const int AccountId = 7;

    private Mock<IAccountRepository> _repo;
    private Mock<IWebSocketHandler> _webSocketHandler;
    private ChosenClientTokenHandler _handler;

    [SetUp]
    public void SetUp()
    {
        _repo = new Mock<IAccountRepository>();
        _repo.Setup(r => r.SetChosenClientTokenAsync(AccountId, It.IsAny<string>())).ReturnsAsync(1);
        _webSocketHandler = new Mock<IWebSocketHandler>();
        _handler = new ChosenClientTokenHandler(_repo.Object, _webSocketHandler.Object);
    }

    private static HttpContext CreateRequest(string token, bool signedIn = true)
    {
        var context = HttpUtil.CreateMockHttpContext(new { token });
        context.Request.ContentType = "application/json";
        if (signedIn)
            HttpUtil.SetAuthenticatedUser(context, AccountId);
        return context;
    }

    [Test]
    public async Task SetChosenClientToken_Anonymous_ReturnsUnauthorized()
    {
        var result = await _handler.HandleSetChosenClientToken(CreateRequest("kuras", signedIn: false));

        Assert.That(result, Is.InstanceOf<UnauthorizedHttpResult>());
        _repo.Verify(r => r.SetChosenClientTokenAsync(It.IsAny<int>(), It.IsAny<string>()), Times.Never);
    }

    [Test]
    public async Task SetChosenClientToken_UppercaseToken_StoresLowercase()
    {
        var result = await _handler.HandleSetChosenClientToken(CreateRequest("KURAS"));

        var ok = result as Ok<ChosenClientTokenResponse>;
        Assert.That(ok?.Value, Is.EqualTo(new ChosenClientTokenResponse("kuras", false)));
        _repo.Verify(r => r.SetChosenClientTokenAsync(AccountId, "kuras"), Times.Once);
    }

    [Test]
    public async Task SetChosenClientToken_LettersInAnyOrder_IsStored()
    {
        var result = await _handler.HandleSetChosenClientToken(CreateRequest("aaaaa"));

        Assert.That(result, Is.InstanceOf<Ok<ChosenClientTokenResponse>>());
    }

    [TestCase("kurae")]
    [TestCase("kura")]
    [TestCase("kurass")]
    [TestCase("kur4s")]
    public async Task SetChosenClientToken_OutsideFormat_ReturnsBadRequest(string token)
    {
        var result = await _handler.HandleSetChosenClientToken(CreateRequest(token));

        Assert.That(result, Is.InstanceOf<BadRequest<string>>());
        _repo.Verify(r => r.SetChosenClientTokenAsync(It.IsAny<int>(), It.IsAny<string>()), Times.Never);
    }

    [Test]
    public async Task SetChosenClientToken_TokenHeldByConnection_ReportsInUse()
    {
        _webSocketHandler.Setup(w => w.RemoteTokenExists("kuras")).Returns(true);

        var result = await _handler.HandleSetChosenClientToken(CreateRequest("kuras"));

        var ok = result as Ok<ChosenClientTokenResponse>;
        Assert.That(ok?.Value?.InUse, Is.True);
    }

    [Test]
    public async Task GetChosenClientToken_Anonymous_ReturnsNullWithoutDatabase()
    {
        var token = await _handler.GetChosenClientTokenAsync(CreateRequest("kuras", signedIn: false));

        Assert.That(token, Is.Null);
        _repo.Verify(r => r.GetChosenClientTokenAsync(It.IsAny<int>()), Times.Never);
    }
}
