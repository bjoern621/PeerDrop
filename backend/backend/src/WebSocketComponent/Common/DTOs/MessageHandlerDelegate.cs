using System.Text.Json;

namespace backend.WebSocketComponent.Common.DTOs
{
    public delegate Task MessageHandlerDelegate(string clientToken, JsonElement messageData);
}