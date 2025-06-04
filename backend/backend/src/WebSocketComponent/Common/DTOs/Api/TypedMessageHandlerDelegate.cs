namespace backend.WebSocketComponent.Common.DTOs.Api;

public delegate Task TypedMessageHandlerDelegate<T>(string clientToken, T messageData);