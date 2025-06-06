using backend.AccountComponent.Dataaccess.Api.Entity;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Dataaccess.Impl;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

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
    public async Task TearDown()
    {
        await ResetDatabaseAsync();
        _scope.Dispose();
    }

    [Test]
    public void SaveAsync_Returns_Id()
    {
        var account = new Account("testuser", "testpassword");
        var id = _accountRepository.SaveAsync(account).Result;
        Assert.That(id, Is.EqualTo(1));
    }
    
    [Test]
    public void SaveAsync_Returns_Id2()
    {
        var account = new Account("testuser", "testpassword");
        var id = _accountRepository.SaveAsync(account).Result;
        Assert.That(id, Is.EqualTo(1));
        account = new Account("testuser2", "testpassword");
        id = _accountRepository.SaveAsync(account).Result;
        Assert.That(id, Is.EqualTo(2));
    }
    
    private async Task ResetDatabaseAsync()
    {
        var host     = Environment.GetEnvironmentVariable("DB_HOST")!;
        var user     = Environment.GetEnvironmentVariable("DB_USERNAME")!;
        var pass     = Environment.GetEnvironmentVariable("DB_PASSWORD")!;
        var database = Environment.GetEnvironmentVariable("DB_DATABASE_NAME")!;
    
        var connString = $"Host={host};Username={user};Password={pass};Database={database}";
    
        await using var dataSource = NpgsqlDataSource.Create(connString);
        await using var cmd = dataSource.CreateCommand("TRUNCATE TABLE users RESTART IDENTITY CASCADE");
        await cmd.ExecuteNonQueryAsync();
    }
}