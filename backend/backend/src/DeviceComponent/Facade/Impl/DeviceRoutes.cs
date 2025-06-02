using backend.DeviceComponent.Facade.Api;
using backend.DeviceComponent.Logic.Api;

namespace backend.DeviceComponent.Facade.Impl;

public class DeviceRoutes : IDeviceRoutes
{
    public Task<Guid> RegisterRoutes(WebApplication app)
    {
        app.MapPost("/device/register", (IDeviceHandler handler, HttpContext context) =>
            handler.RegisterDeviceAsync(context));
    }
}
