using System.Text.Json;
using System.Text.Json.Serialization;

<<<<<<<< HEAD:backend/backend/src/WebSocketComponent/Common/DTOs/Api/ITypedMessage.cs
namespace backend.WebSocketComponent.Common.DTOs.Api;
========
namespace backend.WebSocketComponent.Common.Api.DTOs;
>>>>>>>> origin/main:backend/backend/src/WebSocketComponent/Common/Api/DTOs/ITypedMessage.cs

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