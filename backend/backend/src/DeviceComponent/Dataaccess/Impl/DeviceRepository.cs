using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.DeviceComponent.Dataaccess.Api.Entity;
using Npgsql;
using backend.DeviceComponent.Common.DTOs;

namespace backend.DeviceComponent.Dataaccess.Impl;

public class DeviceRepository(NpgsqlDataSource _dataSource) : IDeviceRepository
{
    /// <summary>
    /// Saves the device registration for the account.
    /// Registering the same device twice for the same account is idempotent.
    /// </summary>
    public async Task<Guid> SaveDeviceAsync(Device device)
    {
        await using var cmd = _dataSource.CreateCommand(
            "INSERT INTO devices (uuid, display_name, account_id) VALUES (@uuid, @name, @accountId) "
                + "ON CONFLICT (uuid, account_id) DO NOTHING"
        );
        cmd.Parameters.AddWithValue("uuid", device.GetUuid());
        cmd.Parameters.AddWithValue("name", device.GetDisplayName());
        cmd.Parameters.AddWithValue("accountId", device.GetAccountId());

        await cmd.ExecuteNonQueryAsync();
        return device.GetUuid();
    }

    /// <summary>
    /// The returned DeviceLoginDtos don't have a status set.
    /// </summary>
    public async Task<List<DeviceLoginDto>> GetAllDisplayNamesForAccountAsync(int accountId)
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
                Uuid = reader.GetGuid(0),
                Status = "invalid" // Should be updated later
            };
            devices.Add(deviceDto);
        }
        return devices;
    }

    public async Task<int> DeleteDeviceAsync(int accountId, Guid uuid)
    {
        await using var cmd = _dataSource.CreateCommand(
            "DELETE FROM devices WHERE uuid = @uuid AND account_id = @accountId"
        );
        cmd.Parameters.AddWithValue("@uuid", uuid);
        cmd.Parameters.AddWithValue("@accountId", accountId);

        return await cmd.ExecuteNonQueryAsync(); // returns number of affected rows
    }

    public async Task<Device?> GetDeviceByUuidAsync(Guid uuid, int accountId)
    {
        await using var cmd = _dataSource.CreateCommand(
            "SELECT uuid, display_name, account_id FROM devices WHERE uuid = @uuid AND account_id = @accountId"
        );
        cmd.Parameters.AddWithValue("uuid", uuid);
        cmd.Parameters.AddWithValue("accountId", accountId);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new Device(
                reader.GetString(1), // display_name
                reader.GetGuid(0), // uuid
                reader.GetInt32(2) // account_id
            );
        }
        return null; // The device is not registered for the given account
    }

    /// <summary>
    /// Returns the ids of all accounts that registered the device.
    /// The list is empty if no account registered the device.
    /// </summary>
    public async Task<List<int>> GetAccountIdsByDeviceUuidAsync(Guid uuid)
    {
        await using var cmd = _dataSource.CreateCommand(
            "SELECT account_id FROM devices WHERE uuid = @uuid"
        );
        cmd.Parameters.AddWithValue("uuid", uuid);

        await using var reader = await cmd.ExecuteReaderAsync();
        var accountIds = new List<int>();
        while (await reader.ReadAsync())
        {
            accountIds.Add(reader.GetInt32(0));
        }
        return accountIds;
    }
}
