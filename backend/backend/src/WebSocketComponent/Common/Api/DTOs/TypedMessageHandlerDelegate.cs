namespace backend.WebSocketComponent.Common.Api.DTOs;

public delegate Task TypedMessageHandlerDelegate<T>(string clientToken, T messageData);