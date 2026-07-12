using System.Text;
using backend.AccountComponent.Common.Api.DTOs;
using backend.AccountComponent.Common.Api.Exception;
using backend.AccountComponent.Dataaccess.Api.Entity;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Logic.Api;
using backend.AccountComponent.Logic.Impl;
using backend.tests.TestUtils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Moq;

namespace backend.tests.AccountComponent.Logic.Impl;

[Category("UnitTest")]
public class AccountCreationHandlerTests
{
    private Mock<IAccountRepository> _repoMock;
    private Mock<IPasswordHasher> _hasherMock;
    private Mock<IAuthTokenService> _tokenServiceMock;
    private AccountCreationHandler _handler;

    [SetUp]
    public void SetUp()
    {
        _repoMock = new Mock<IAccountRepository>();
        _hasherMock = new Mock<IPasswordHasher>();
        _tokenServiceMock = new Mock<IAuthTokenService>();
        _handler = new AccountCreationHandler(_repoMock.Object, _hasherMock.Object, _tokenServiceMock.Object);
    }

    [Test]
    public async Task HandleAccounts_ValidAccount_CreatesAccount()
    {
        var dto = new AccountCreateDto { DisplayName = "testuser", Password = "secure123" };
        var context = HttpUtil.CreateMockHttpContext(dto);

        _repoMock.Setup(r => r.GetByNameAsync("testuser")).ReturnsAsync((AccountRetrieveDto?)null);
        _hasherMock.Setup(h => h.HashPassword("secure123")).Returns("hashedpass");
        _repoMock.Setup(r => r.SaveAsync(It.IsAny<Account>())).ReturnsAsync(123);

        var result = await _handler.HandleAccounts(context);

        Assert.That(result, Is.Not.Null);
        _tokenServiceMock.Verify(t => t.IssueTokensAsync(context, 123), Times.Once);
    }

    [Test]
    public async Task HandleAccounts_UsernameAlreadyExists_ReturnsConflict()
    {
        var createDto = new AccountCreateDto { DisplayName = "existinguser", Password = "hashedpass" };
        var existingUserRetrieveDto = new AccountRetrieveDto { DisplayName = "existinguser", Password = "another_hashedpass", Id = 1};
        var context = HttpUtil.CreateMockHttpContext(createDto);

        _repoMock.Setup(r => r.GetByNameAsync("existinguser")).ReturnsAsync(existingUserRetrieveDto);

        var result = await _handler.HandleAccounts(context);

        Assert.That(result, Is.TypeOf<Conflict<string>>());
    }

    [Test]
    public async Task HandleAccounts_InvalidJson_ReturnsBadRequest()
    {
        var invalidJson = "{ invalid json }";
        var context = new DefaultHttpContext();
        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(invalidJson));

        var result = await _handler.HandleAccounts(context);

        Assert.That(result, Is.TypeOf<BadRequest<string>>());
    }

    [Test]
    public async Task HandleAccounts_NullDeserialization_ReturnsBadRequest()
    {
        var emptyJson = "null";
        var context = new DefaultHttpContext();
        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(emptyJson));

        var result = await _handler.HandleAccounts(context);

        Assert.That(result, Is.TypeOf<BadRequest<string>>());
    }

    [Test]
    public void HandleAccounts_Short_Username_ThrowsException()
    {
        var dto = new AccountCreateDto { DisplayName = "hi", Password = "secure123" };
        var context = HttpUtil.CreateMockHttpContext(dto);

        _repoMock.Setup(r => r.GetByNameAsync("hi")).ReturnsAsync((AccountRetrieveDto?)null);

        Assert.ThrowsAsync<InvalidUsernameFormatException>(async () =>
        {
            await _handler.HandleAccounts(context);
        });
    }
    
    [Test]
    public void HandleAccounts_Username_Containing_Whitespace_ThrowsException()
    {
        var dto = new AccountCreateDto { DisplayName = "example user", Password = "secure123" };
        var context = HttpUtil.CreateMockHttpContext(dto);

        _repoMock.Setup(r => r.GetByNameAsync("example user")).ReturnsAsync((AccountRetrieveDto?)null);

        Assert.ThrowsAsync<InvalidUsernameFormatException>(async () =>
        {
            await _handler.HandleAccounts(context);
        });
    }
    
    [Test]
    public void HandleAccounts_Empty_Username_ThrowsException()
    {
        var dto = new AccountCreateDto { DisplayName = "", Password = "secure123" };
        var context = HttpUtil.CreateMockHttpContext(dto);

        _repoMock.Setup(r => r.GetByNameAsync("")).ReturnsAsync((AccountRetrieveDto?)null);

        Assert.ThrowsAsync<InvalidUsernameFormatException>(async () =>
        {
            await _handler.HandleAccounts(context);
        });
    }

    [Test]
    public void HandleAccounts_ShortPassword_ThrowsException()
    {
        var dto = new AccountCreateDto { DisplayName = "validuser", Password = "abc" };
        var context = HttpUtil.CreateMockHttpContext(dto);

        _repoMock.Setup(r => r.GetByNameAsync("validuser")).ReturnsAsync((AccountRetrieveDto?)null);

        Assert.ThrowsAsync<InvalidPasswordFormatException>(async () =>
        {
            await _handler.HandleAccounts(context);
        });
    }
    
    [Test]
    public void HandleAccounts_Password_With_Whitespace_ThrowsException()
    {
        var dto = new AccountCreateDto { DisplayName = "validuser", Password = "my password" };
        var context = HttpUtil.CreateMockHttpContext(dto);

        _repoMock.Setup(r => r.GetByNameAsync("validuser")).ReturnsAsync((AccountRetrieveDto?)null);

        Assert.ThrowsAsync<InvalidPasswordFormatException>(async () =>
        {
            await _handler.HandleAccounts(context);
        });
    }
    
    [Test]
    public void HandleAccounts_Empty_Password_ThrowsException()
    {
        var dto = new AccountCreateDto { DisplayName = "validuser", Password = "" };
        var context = HttpUtil.CreateMockHttpContext(dto);

        _repoMock.Setup(r => r.GetByNameAsync("validuser")).ReturnsAsync((AccountRetrieveDto?)null);

        Assert.ThrowsAsync<InvalidPasswordFormatException>(async () =>
        {
            await _handler.HandleAccounts(context);
        });
    }
}

