using backend.AccountComponent.Dataaccess.Api.Entity;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Dataaccess.Impl;
using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Dataaccess.Api.Entity;
using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.DeviceComponent.Dataaccess.Impl;
using backend.tests.TestUtils;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace backend.tests.DeviceComponent.Dataacess.Impl;

[Category("DatabaseIntegration")]
public class DeviceRepositoryTest
{
    private ServiceProvider _serviceProvider;
    private IServiceScope _scope;
    private IDeviceRepository _deviceRepository;
    private IAccountRepository _accountRepository;

    [OneTimeSetUp]
    public async Task OneTimeSetUpAsync()
    {
        var services = new ServiceCollection();

        services.AddSingleton(await DatabaseUtil.InitializeDatabaseAsync());

        services.AddScoped<IDeviceRepository, DeviceRepository>();
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
        _deviceRepository = _scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
        _accountRepository = _scope.ServiceProvider.GetRequiredService<IAccountRepository>();
        await DatabaseUtil.ResetDatabaseAsync();
    }

    [TearDown]
    public void TearDown()
    {
        _scope.Dispose();
    }

    [Test]
    public async Task SaveAsync_Returns_Uuid()
    {
        var account = new Account("testuser", "testpassword");
        var id = await _accountRepository.SaveAsync(account);
        Assert.That(id, Is.EqualTo(1));
        Guid guid = Guid.NewGuid();
        var device = new Device("testdevice", guid, 1);
        var uuid = await _deviceRepository.SaveDeviceAsync(device);
        Assert.That(uuid, Is.EqualTo(guid));
        Guid guid2 = Guid.NewGuid();
        var device2 = new Device("testdevice2", guid2, 1);
        var uuid2 = await _deviceRepository.SaveDeviceAsync(device2);
        Assert.That(uuid2, Is.EqualTo(guid2));
    }

    [Test]
    public async Task SaveAsync_With_Duplicate_Uuid_Throws_PostgresException()
    {
        var account = new Account("testuser", "testpassword");
        var id = await _accountRepository.SaveAsync(account);
        Assert.That(id, Is.EqualTo(1));
        Guid guid = Guid.NewGuid();
        var device = new Device("testdevice", guid, 1);
        var uuid = await _deviceRepository.SaveDeviceAsync(device);
        Assert.That(uuid, Is.EqualTo(guid));
        var device2 = new Device("testdevice", guid, 1);
        var ex = Assert.ThrowsAsync<PostgresException>(async () =>
        {
            await _deviceRepository.SaveDeviceAsync(device2);
        });
        Assert.That(ex, Is.Not.Null);
    }

    [Test]
    public async Task GetDisplayNamesForAccountAsync_Returns_AllDeviceDisplayNames()
    {
        var account = new Account("testuser", "testpassword");
        var id = await _accountRepository.SaveAsync(account);
        Assert.That(id, Is.EqualTo(1));
        const int accountId = 1;
        const string displayName = "testdevice";
        Guid guid = Guid.NewGuid();
        var device = new Device(displayName, guid, accountId);
        var uuid = await _deviceRepository.SaveDeviceAsync(device);
        Guid guid2 = Guid.NewGuid();
        var device2 = new Device(displayName, guid2, accountId);
        var uuid2 = await _deviceRepository.SaveDeviceAsync(device2);
        Assert.That(uuid, Is.EqualTo(guid));
        Assert.That(uuid2, Is.EqualTo(guid2));
        var deviceLoginDtos = await _deviceRepository.GetAllDisplayNamesForAccountAsync(accountId, Guid.Empty);
        Assert.That(deviceLoginDtos, Is.Not.Null);
        Assert.Multiple(() =>
        {
            foreach (var dto in deviceLoginDtos)
            {
                Assert.That(dto.DisplayName, Is.EqualTo(displayName));
            }
        });
    }

    [Test]
    public async Task GetAllDisplayNamesForAccountAsync_Returns_EmptyList_For_Nonexistent_AccountId()
    {
        var account = new Account("testuser", "testpassword");
        var id = await _accountRepository.SaveAsync(account);
        Assert.That(id, Is.EqualTo(1));
        var nonExistentDevices = await _deviceRepository.GetAllDisplayNamesForAccountAsync(2, Guid.Empty);
        Assert.That(nonExistentDevices, Is.Empty);

        // add some device
        const string displayName = "testdevice";
        const int accountId = 1;
        var device = new Device(displayName, Guid.NewGuid(), accountId);
        await _deviceRepository.SaveDeviceAsync(device);

        // get nonexistent account again
        var nonExistentDevices2 = await _deviceRepository.GetAllDisplayNamesForAccountAsync(2, Guid.Empty);
        Assert.That(nonExistentDevices, Is.Empty);
    }

    [Test]
    public async Task GetAllDisplayNamesForAccountAsync_Recognizes_Current_Device()
    {
        var account = new Account("testuser", "testpassword");
        var id = await _accountRepository.SaveAsync(account);
        Assert.That(id, Is.EqualTo(1));
        // add some device
        const string displayName = "testdevice";
        const int accountId = 1;
        Guid guid = Guid.NewGuid();
        var device = new Device(displayName, guid, accountId);
        await _deviceRepository.SaveDeviceAsync(device);
        List<DeviceLoginDto> devices = await _deviceRepository.GetAllDisplayNamesForAccountAsync(accountId, guid);
        Assert.That(devices.First().IsCurrentDevice, Is.EqualTo(true));
    }

    [Test]
    public async Task GetAllDisplayNamesForAccountAsync_Recognizes_Not_Current_Device()
    {
        var account = new Account("testuser", "testpassword");
        var id = await _accountRepository.SaveAsync(account);
        Assert.That(id, Is.EqualTo(1));
        // add some device
        const string displayName = "testdevice";
        const int accountId = 1;
        Guid guid = Guid.NewGuid();
        var device = new Device(displayName, guid, accountId);
        await _deviceRepository.SaveDeviceAsync(device);
        List<DeviceLoginDto> uuid = await _deviceRepository.GetAllDisplayNamesForAccountAsync(accountId, Guid.NewGuid());
        Assert.That(uuid.ElementAt(0).IsCurrentDevice, Is.EqualTo(false));
    }

    [Test]
    public async Task DeleteAsync_Deletes_Device()
    {
        var account = new Account("testuser", "testpassword");
        var id = await _accountRepository.SaveAsync(account);
        Assert.That(id, Is.EqualTo(1));
        // add some device
        const string displayName = "testdevice";
        const int accountId = 1;
        Guid guid = Guid.NewGuid();
        var device = new Device(displayName, guid, accountId);
        var uuid = await _deviceRepository.SaveDeviceAsync(device);
        var result = await _deviceRepository.DeleteDeviceAsync(accountId, uuid);
        Assert.That(result, Is.EqualTo(1));
    }
}