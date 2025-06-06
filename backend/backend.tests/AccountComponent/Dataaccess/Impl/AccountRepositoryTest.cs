using backend.AccountComponent.Dataaccess.Api.Entity;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Dataaccess.Impl;
using Microsoft.Extensions.DependencyInjection;

namespace backend.tests.AccountComponent.Dataaccess.Impl;

[Category("DatabaseIntegration")]
public class AccountRepositoryTest
{
    private ServiceProvider _serviceProvider;
    private IServiceScope _scope;
    private IAccountRepository _accountRepository;
    
    [OneTimeSetUp]
    public void OneTimeSetUp()
    {
        var services = new ServiceCollection();
        services.AddScoped<IAccountRepository, AccountRepository>();
        _serviceProvider = services.BuildServiceProvider();
    }
    
    [OneTimeTearDown]
    public void OneTimeTearDown()
    {
        _serviceProvider?.Dispose();
    }
    
    [SetUp]
    public void SetUp()
    {
        _scope = _serviceProvider.CreateScope();
        _accountRepository = _scope.ServiceProvider.GetRequiredService<IAccountRepository>();
    }
    
    [TearDown]
    public void TearDown()
    {
        _scope.Dispose();
    }

    [Test]
    public void SaveAsync_Returns_Id()
    {
        var account = new Account("testuser", "testpassword");
        var id = _accountRepository.SaveAsync(account).Result;
        Assert.That(id, Is.EqualTo(1));
    }
}