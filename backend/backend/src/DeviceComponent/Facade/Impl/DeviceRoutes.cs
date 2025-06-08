using backend.DeviceComponent.Facade.Api;
using backend.DeviceComponent.Logic.Api;

namespace backend.DeviceComponent.Facade.Impl;

public class DeviceRoutes : IDeviceRoutes
{
    public Task RegisterRoutes(WebApplication app)
    {
        app.MapPost("/device/register", (IDeviceHandler handler, HttpContext context) =>
            handler.RegisterDeviceAsync(context));

        app.MapGet("/device/fetchAll", (IDeviceHandler handler, HttpContext context) =>
            handler.GetDevicesByUserAsync(context)); 

        return Task.CompletedTask;
    }
}