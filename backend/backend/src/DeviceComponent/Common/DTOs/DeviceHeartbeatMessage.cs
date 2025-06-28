using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.DeviceComponent.Common.DTOs;

public class DeviceHeartbeatMessage : ITypedMessage
{
    public static string TypeString => "device-heartbeat";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("uuid")]
    public required Guid Uuid { get; set; }
}