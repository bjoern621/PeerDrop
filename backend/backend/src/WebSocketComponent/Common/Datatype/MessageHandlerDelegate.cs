using System.Text.Json;

namespace backend.WebSocketComponent.Common.Datatype
{
    public delegate Task MessageHandlerDelegate(string clientToken, JsonElement messageData);
}