namespace backend.WebSocketComponent.Common.Datatype
{
    public delegate Task TypedMessageHandlerDelegate<T>(string clientToken, T messageData);
}