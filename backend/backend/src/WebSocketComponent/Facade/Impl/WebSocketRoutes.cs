using backend.WebSocketComponent.Facade.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.WebSocketComponent.Facade.Impl;

public class WebSocketRoutes : IWebSocketRoutes
{
    public void RegisterRoutes(WebApplication app)
    {
        app.MapGet("/connect", (IWebSocketHandler handler, HttpContext context) =>
            handler.HandleConnect(context));
    }
}