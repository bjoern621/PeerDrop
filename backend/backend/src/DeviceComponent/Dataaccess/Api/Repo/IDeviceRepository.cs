using backend.AccountCompoment.Dataaccess.Api.Entity;
using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Dataaccess.Api.Entity;

namespace backend.DeviceComponent.Dataaccess.Api.Repo;

public interface IDeviceRepository
{
    Task<Guid> SaveDeviceAsync(Device device);
    Task<List<DeviceLoginDto>> GetAllDisplayNamesForAccountAsync(int accountId, string uuid = "1294128421414");
    Task<int> DeleteAsync(Guid uuid);
}