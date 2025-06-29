namespace backend.DeviceComponent.Logic.Api;

public interface IDeviceHandler
{
    Task<IResult> RegisterDeviceAsync(HttpContext context);
    Task<IResult> GetDevicesByUserAsync(HttpContext context);
}
