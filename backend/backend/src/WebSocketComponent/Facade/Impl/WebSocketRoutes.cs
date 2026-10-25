using backend.AccountComponent.Logic.Api;
using backend.WebSocketComponent.Facade.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.WebSocketComponent.Facade.Impl;

public class WebSocketRoutes : IWebSocketRoutes
{
    public void RegisterRoutes(WebApplication app)
    {
        app.MapGet("/connect", async (IWebSocketHandler handler, IChosenClientTokenHandler chosenTokens, HttpContext context) =>
            await handler.HandleConnect(context, await chosenTokens.GetChosenClientTokenAsync(context)));
    }
}