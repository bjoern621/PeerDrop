using backend.AccountComponent.Dataaccess.Api.Entity;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Dataaccess.Impl;
using backend.tests.TestUtils;
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
    public async Task SetUp()
    {
        _scope = _serviceProvider.CreateScope();
        _accountRepository = _scope.ServiceProvider.GetRequiredService<IAccountRepository>();
        await DatabaseUtil.ResetDatabaseAsync();
    }
    
    [TearDown]
    public void TearDown()
    {
        _scope.Dispose();
    }

    [Test]
    public async Task SaveAsync_Returns_Id()
    {
        var account = new Account("testuser", "testpassword");
        var id = await _accountRepository.SaveAsync(account);
        Assert.That(id, Is.EqualTo(1));
        var account2 = new Account("testuser2", "testpassword");
        var id2 = await _accountRepository.SaveAsync(account2);
        Assert.That(id2, Is.EqualTo(2));
    }
    
    [Test]
    public async Task SaveAsync_With_Duplicate_Username_Throws_PostgresException()
    {
        var account = new Account("testuser", "testpassword");
        var id = await _accountRepository.SaveAsync(account);
        Assert.That(id, Is.EqualTo(1));
        var account2 = new Account("testuser", "testpassword2");
        var ex = Assert.ThrowsAsync<PostgresException>(async () =>
        {
            await _accountRepository.SaveAsync(account2);
        });
    }
    
    [Test]
    public async Task GetByNameAsync_Returns_Existing_Account()
    {
        const string username = "testuser";
        const string password = "testpassword";
        var account = new Account(username, password);
        var id = await _accountRepository.SaveAsync(account);
        Assert.That(id, Is.EqualTo(1));
        var accountRetrieveDto = await _accountRepository.GetByNameAsync(username);
        Assert.That(accountRetrieveDto, Is.Not.Null);
        Assert.Multiple(() =>
        {
            Assert.That(accountRetrieveDto.DisplayName, Is.EqualTo(username));
            Assert.That(accountRetrieveDto.Password, Is.EqualTo(password));
            Assert.That(accountRetrieveDto.Id, Is.EqualTo(1));
        });
    }
    
    [Test]
    public async Task GetByNameAsync_Returns_Null_For_Nonexistent_Username()
    {
        var nonExistentAccount = await _accountRepository.GetByNameAsync("nonexistent");
        Assert.That(nonExistentAccount, Is.Null);
        
        // add some account
        const string username = "testuser";
        const string password = "testpassword";
        var account = new Account(username, password);
        await _accountRepository.SaveAsync(account);
        
        // get nonexistent account again
        var nonExistentAccount2 = await _accountRepository.GetByNameAsync("nonexistent");
        Assert.That(nonExistentAccount2, Is.Null);
    }
    
    [Test]
    public async Task GetByIdAsync_Returns_Existing_Account()
    {
        const string username = "testuser";
        const string password = "testpassword";
        var account = new Account(username, password);
        var id = await _accountRepository.SaveAsync(account);
        Assert.That(id, Is.EqualTo(1));
        
        var accountRetrieveDto = await _accountRepository.GetByIdAsync(id);
        Assert.That(accountRetrieveDto, Is.Not.Null);
        Assert.Multiple(() =>
        {
            Assert.That(accountRetrieveDto.DisplayName, Is.EqualTo(username));
            Assert.That(accountRetrieveDto.Password, Is.EqualTo(password));
            Assert.That(accountRetrieveDto.Id, Is.EqualTo(id));
        });
    }
    
    [Test]
    public async Task GetByIdAsync_Returns_Null_For_Nonexistent_Id()
    {
        var nonExistentAccount = await _accountRepository.GetByIdAsync(1);
        Assert.That(nonExistentAccount, Is.Null);
        
        // add some account
        const string username = "testuser";
        const string password = "testpassword";
        var account = new Account(username, password);
        var id = await _accountRepository.SaveAsync(account);
        Assert.That(id, Is.EqualTo(1));
        
        // get another nonexistent account
        var nonExistentAccount2 = await _accountRepository.GetByIdAsync(2);
        Assert.That(nonExistentAccount2, Is.Null);
    }
}