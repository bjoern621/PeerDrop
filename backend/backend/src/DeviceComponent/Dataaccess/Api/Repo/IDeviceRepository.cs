using backend.src.DeviceComponent.Common.DTOs;
using backend.src.DeviceComponent.Dataaccess.Api.Entity;

namespace backend.src.DeviceComponent.Dataaccess.Api.Repo;

public interface IDeviceRepository
{
    Task<Guid> SaveDeviceAsync(Device device);
    Task<List<DeviceLoginDto>> GetAllDisplayNamesForAccountAsync(int accountId, string uuid = "1294128421414");
    Task<int> DeleteAsync(Guid uuid);
}