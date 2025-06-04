using backend.DeviceComponent.Dataaccess.Api.Entity;

namespace backend.DeviceComponent.Logic.Api;

public interface IDeviceHandler
{
    Task<IResult> RegisterDeviceAsync(HttpContext context);
    Task<IResult> GetDeviceByUuidAsync(HttpContext context);
}
