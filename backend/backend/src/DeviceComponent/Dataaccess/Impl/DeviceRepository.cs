using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.DeviceComponent.Dataaccess.Api.Entity;
using Npgsql;
using backend.DeviceComponent.Common.DTOs;
using Microsoft.AspNetCore.Identity;
using backend.DeviceComponent.Logic.Api;
using System.Diagnostics;

namespace backend.DeviceComponent.Dataaccess.Impl;

public class DeviceRepository(NpgsqlDataSource _dataSource, IDeviceService _deviceService) : IDeviceRepository
{
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

    public async Task<List<DeviceLoginDto>> GetAllDisplayNamesForAccountAsync(int accountId, Guid? uuid)
    {
        await using var cmd = _dataSource.CreateCommand(
            "SELECT uuid, display_name FROM devices WHERE account_id = @accountId"
        );
        cmd.Parameters.AddWithValue("accountId", accountId);

        await using var reader = await cmd.ExecuteReaderAsync();
        var devices = new List<DeviceLoginDto>();
        if (uuid == Guid.Empty)
        {
            uuid = Guid.Parse("00000000-0000-0000-0001-294128421414"); // Never fails
        }

        Debug.Assert(uuid != null, "UUID should not be null here");

        while (await reader.ReadAsync())
        {

            var deviceDto = new DeviceLoginDto
            {
                DisplayName = reader.GetString(1),  // Get the display_name (second column)
                IsCurrentDevice = reader.GetGuid(0) == uuid,
                Uuid = reader.GetGuid(0),
                Status = _deviceService.GetDeviceStatus(reader.GetGuid(0))
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
        cmd.Parameters.AddWithValue("@uuid", uuid);

        return await cmd.ExecuteNonQueryAsync(); // returns number of affected rows
    }

    public Task<Device?> GetDeviceByUuidAsync(Guid uuid)
    {
        return Task.Run(async () =>
        {
            await using var cmd = _dataSource.CreateCommand(
                "SELECT uuid, display_name, account_id FROM devices WHERE uuid = @uuid"
            );
            cmd.Parameters.AddWithValue("uuid", uuid);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new Device(
                    reader.GetString(1), // display_name
                    reader.GetGuid(0), // uuid
                    reader.GetInt32(2) // account_id
                );
            }
            return null; // No device found with the given UUID
        });
    }
}
