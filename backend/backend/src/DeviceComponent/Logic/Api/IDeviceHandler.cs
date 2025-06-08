using backend.src.DeviceComponent.Dataaccess.Api.Entity;

namespace backend.src.DeviceComponent.Logic.Api;

public interface IDeviceHandler
{
    Task<IResult> RegisterDeviceAsync(HttpContext context);
    Task<IResult> GetDevicesByUserAsync(HttpContext context);
}
