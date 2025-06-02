using backend.AccountCompoment.Dataaccess.Api.Entity;
using backend.DeviceComponent.Dataaccess.Api.Entity;

namespace backend.DeviceComponent.Dataaccess.Api.Repo;

public interface IDeviceRepository
{
    Task<Guid> SaveAsync(Device device);
    Task<Device?> GetDeviceByUuidAsync(Guid uuid);
    Task<List<Device>> GetAllForAccountAsync(int accountId);
    Task<int> DeleteAsync(Guid uuid);
}