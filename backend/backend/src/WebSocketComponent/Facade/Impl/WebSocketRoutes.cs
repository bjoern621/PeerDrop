using backend.WebSocketComponent.Facade.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.WebSocketComponent.Facade.Impl;

public class WebSocketRoutes : IWebSocketRoutes
{
    public void RegisterRoutes(WebApplication app)
    {
        app.MapGet("/connect", async (IWebSocketTransport transport, HttpContext context) =>
            await transport.HandleConnect(context));
    }
}
