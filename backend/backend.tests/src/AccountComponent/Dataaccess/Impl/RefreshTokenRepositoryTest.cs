using backend.AccountComponent.Dataaccess.Api.Entity;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Dataaccess.Impl;
using backend.tests.TestUtils;
using Microsoft.Extensions.DependencyInjection;

namespace backend.tests.AccountComponent.Dataaccess.Impl;

[Category("DatabaseIntegration")]
public class RefreshTokenRepositoryTest
{
    private ServiceProvider _serviceProvider;
    private IServiceScope _scope;
    private IRefreshTokenRepository _refreshTokenRepository;
    private int _accountId;

    [OneTimeSetUp]
    public async Task OneTimeSetUpAsync()
    {
        var services = new ServiceCollection();
        services.AddSingleton(await DatabaseUtil.InitializeDatabaseAsync());
        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        _serviceProvider = services.BuildServiceProvider();
    }

    [OneTimeTearDown]
    public void OneTimeTearDown()
    {
        _serviceProvider?.Dispose();
    }

    [SetUp]
    public async Task SetUp()
    {
        _scope = _serviceProvider.CreateScope();
        _refreshTokenRepository = _scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
        await DatabaseUtil.ResetDatabaseAsync();

        // Refresh tokens reference an account
        var accountRepository = _scope.ServiceProvider.GetRequiredService<IAccountRepository>();
        _accountId = await accountRepository.SaveAsync(new Account("testuser", "testpassword"));
    }

    [TearDown]
    public void TearDown()
    {
        _scope.Dispose();
    }

    [Test]
    public async Task SaveAsync_Then_GetByHashAsync_Returns_Token()
    {
        var expiresAt = DateTime.UtcNow.AddDays(365);
        await _refreshTokenRepository.SaveAsync(new RefreshToken("somehash", _accountId, expiresAt));

        var storedToken = await _refreshTokenRepository.GetByHashAsync("somehash");
        Assert.That(storedToken, Is.Not.Null);
        Assert.Multiple(() =>
        {
            Assert.That(storedToken.GetTokenHash(), Is.EqualTo("somehash"));
            Assert.That(storedToken.GetAccountId(), Is.EqualTo(_accountId));
            Assert.That(storedToken.GetExpiresAt(), Is.EqualTo(expiresAt).Within(TimeSpan.FromMilliseconds(1)));
        });
    }

    [Test]
    public async Task GetByHashAsync_Returns_Null_For_Unknown_Hash()
    {
        var storedToken = await _refreshTokenRepository.GetByHashAsync("unknownhash");
        Assert.That(storedToken, Is.Null);
    }

    [Test]
    public async Task DeleteByHashAsync_Removes_Token()
    {
        await _refreshTokenRepository.SaveAsync(
            new RefreshToken("somehash", _accountId, DateTime.UtcNow.AddDays(365)));

        var deletedCount = await _refreshTokenRepository.DeleteByHashAsync("somehash");
        Assert.That(deletedCount, Is.EqualTo(1));

        var storedToken = await _refreshTokenRepository.GetByHashAsync("somehash");
        Assert.That(storedToken, Is.Null);

        var deletedAgainCount = await _refreshTokenRepository.DeleteByHashAsync("somehash");
        Assert.That(deletedAgainCount, Is.EqualTo(0));
    }
}
