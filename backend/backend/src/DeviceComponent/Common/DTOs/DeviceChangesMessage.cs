using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.DeviceComponent.Common.DTOs;

public class DeviceChangesMessage : ITypedMessage
{
    public static string TypeString => "device-changed";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("uuid")]
    public required Guid Uuid { get; set; }

    [JsonPropertyName("status")]
    public required string DeviceStatus { get; set; } // "online", "offline", "busy"
}