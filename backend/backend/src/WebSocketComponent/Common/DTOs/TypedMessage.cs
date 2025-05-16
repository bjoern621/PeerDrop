using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.DTOs;

public struct TypedMessage<T>
{
    public MessageType Type { get; set; }

    public T Msg { get; set; }

    public SerializeableMessage<T> GetSerializableObject()
    {
        return new SerializeableMessage<T>
        {
            Type = Type.GetValue(),
            Msg = Msg
        };
    }
}

public struct SerializeableMessage<T>
{
    [JsonPropertyName("type")]
    public string Type { get; set; }

    [JsonPropertyName("msg")]
    public T Msg { get; set; }
}