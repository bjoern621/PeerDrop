using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.DeviceComponent.Dataaccess.Api.Entity;
using Npgsql;
using backend.DeviceComponent.Common.DTOs;

namespace backend.DeviceComponent.Dataaccess.Impl;

public class DeviceRepository : IDeviceRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public DeviceRepository()
    {
        var host     = Environment.GetEnvironmentVariable("DB_HOST")
                       ?? throw new ApplicationException("DB_HOST not set");
        var user     = Environment.GetEnvironmentVariable("DB_USERNAME")
                       ?? throw new ApplicationException("DB_USERNAME not set");
        var pass     = Environment.GetEnvironmentVariable("DB_PASSWORD")
                       ?? throw new ApplicationException("DB_PASSWORD not set");
        var database = Environment.GetEnvironmentVariable("DB_DATABASE_NAME")
                       ?? throw new ApplicationException("DB_DATABASE_NAME not set");

        var connString = $"Host={host};Username={user};Password={pass};Database={database}";
        _dataSource = NpgsqlDataSource.Create(connString);
    }

    public async Task<Guid> SaveDeviceAsync(Device device)
    {
        await using var cmd = _dataSource.CreateCommand(
            "INSERT INTO devices (uuid, display_name, account_id) VALUES (@uuid, @name, @accountId)"
        );
        cmd.Parameters.AddWithValue("uuid", device.GetUuid());
        cmd.Parameters.AddWithValue("name", device.GetDisplayName());
        cmd.Parameters.AddWithValue("accountId", device.GetAccountId());

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 1) return device.GetUuid();

        throw new InvalidOperationException("Insert failed.");
    }

    public async Task<List<DeviceLoginDto>> GetAllDisplayNamesForAccountAsync(int accountId, string uuid = "1294128421414")
    {
        await using var cmd = _dataSource.CreateCommand(
            "SELECT uuid, display_name FROM devices WHERE account_id = @accountId"
        );
        cmd.Parameters.AddWithValue("accountId", accountId);

        await using var reader = await cmd.ExecuteReaderAsync();
        var devices = new List<DeviceLoginDto>();

        while (await reader.ReadAsync())
        {

            var deviceDto = new DeviceLoginDto
            {
                DisplayName = reader.GetString(1),  // Get the display_name (second column)
                IsCurrentDevice = reader.GetString(0) == uuid
            };
            devices.Add(deviceDto);
        }
        return devices;
    }

    public async Task<int> DeleteAsync(Guid uuid)
    {
        await using var cmd = _dataSource.CreateCommand(
            "DELETE FROM devices WHERE uuid = @uuid"
        );
        cmd.Parameters.AddWithValue("uuid", uuid);

        return await cmd.ExecuteNonQueryAsync(); // returns number of affected rows
    }
}
