namespace backend.DeviceComponent.Logic.Api;

public interface IDeviceHandler
{
    Task<IResult> RegisterDeviceAsync(HttpContext context);
    Task<IResult> GetDevicesByUserAsync(HttpContext context);
    Task<IResult> DeleteCurrentDeviceAsync(HttpContext context);
    Task<IResult> DeleteOtherDeviceAsync(HttpContext context);
}
