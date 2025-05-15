namespace backend.WebSocketComponent.Common.DTOs
{
    public delegate Task TypedMessageHandlerDelegate<T>(string clientToken, T messageData);
}