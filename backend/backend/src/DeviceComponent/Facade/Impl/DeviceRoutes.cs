using backend.DeviceComponent.Facade.Api;
using backend.DeviceComponent.Logic.Api;

namespace backend.DeviceComponent.Facade.Impl;

public class DeviceRoutes : IDeviceRoutes
{
    public Task RegisterRoutes(WebApplication app)
    {
        app.MapPost("/device/register", (IDeviceHandler handler, HttpContext context) =>
            handler.RegisterDeviceAsync(context)); // ✔️ handler already returns Task<IResult>

        app.MapPost("/device/login", (IDeviceHandler handler, HttpContext context) =>
            handler.GetDeviceByUuidAsync(context)); // ✔️ same pattern

        return Task.CompletedTask;
    }
}