namespace backend.endpoints.websocket;

public static class Routes
{
    public static void RegisterWebSocketRoutes(this WebApplication app)
    {
        app.MapGet("/connect", WebSocketHandler.HandleConnect);
    }
}