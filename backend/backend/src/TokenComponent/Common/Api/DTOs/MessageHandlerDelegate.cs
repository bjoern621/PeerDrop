using System.Text.Json;

namespace backend.TokenComponent.Common.Api.DTOs;

public delegate Task MessageHandlerDelegate(string clientToken, JsonElement messageData);