using backend.WebSocketComponent.Facade.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.WebSocketComponent.Facade.Impl;

public class WebSocketRoutes : IWebSocketRoutes
{
    public void RegisterRoutes(WebApplication app)
    {
        app.MapGet("/connect", async (IWebSocketHandler handler, HttpContext context, string? requestedToken) =>
            await handler.HandleConnect(context, requestedToken));
    }
}
