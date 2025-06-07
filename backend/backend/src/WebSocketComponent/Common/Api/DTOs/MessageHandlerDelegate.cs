using System.Text.Json;

namespace backend.WebSocketComponent.Common.Api.DTOs;

public delegate Task MessageHandlerDelegate(string clientToken, JsonElement messageData);