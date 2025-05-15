using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.DTOs;

public struct TypedMessage<T>
{
    [JsonPropertyName("type")]
    public String Type { get; set; }

    [JsonPropertyName("msg")]
    public T Msg { get; set; }
}