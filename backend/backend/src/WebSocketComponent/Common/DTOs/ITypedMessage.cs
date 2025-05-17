using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.DTOs;

public interface ITypedMessage
{
    static abstract string TypeString { get; }

    [JsonIgnore]
    string InstanceTypeString { get; }

    /// <summary>
    /// Serializes the message to a JSON string, including its type.
    /// </summary>
    string ToJson()
    {
        var wrapper = new
        {
            type = this.InstanceTypeString,
            msg = JsonSerializer.Deserialize<object>(JsonSerializer.Serialize(this, this.GetType()))
        };

        return JsonSerializer.Serialize(wrapper);
    }
}