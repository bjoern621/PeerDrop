namespace backend.DeviceComponent.Facade.Api;

public interface IDeviceRoutes
{
    Task<Guid> RegisterRoutes(WebApplication app);
}