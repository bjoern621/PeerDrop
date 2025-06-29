using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Dataaccess.Api.Entity;

namespace backend.DeviceComponent.Dataaccess.Api.Repo;

public interface IDeviceRepository
{
    Task<Guid> SaveDeviceAsync(Device device);
    Task<List<DeviceLoginDto>> GetAllDisplayNamesForAccountAsync(int accountId, Guid uuid);
    Task<int> DeleteAsync(Guid uuid);
    Task<Device?> GetDeviceByUuidAsync(Guid uuid);
}