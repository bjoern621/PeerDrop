using backend.DeviceComponent.Facade.Api;
using backend.DeviceComponent.Logic.Api;

namespace backend.DeviceComponent.Facade.Impl;

public class DeviceRoutes : IDeviceRoutes
{
    public Task RegisterRoutes(WebApplication app)
    {
        app.MapGet("/devices", (IDeviceHandler handler, HttpContext context) =>
            handler.GetDevicesByUserAsync(context));

        app.MapPost("/device/register", (IDeviceHandler handler, HttpContext context) =>
            handler.RegisterDeviceAsync(context));

        app.MapDelete("/device", (IDeviceHandler handler, HttpContext context) =>
            handler.DeleteCurrentDeviceAsync(context));
        
        app.MapDelete("/devices", (IDeviceHandler handler, HttpContext context) =>
            handler.DeleteOtherDeviceAsync(context));

        return Task.CompletedTask;
    }
}