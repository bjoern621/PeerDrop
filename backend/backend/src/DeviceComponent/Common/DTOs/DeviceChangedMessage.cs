using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.DeviceComponent.Common.DTOs;

public class DeviceChangedMessage : ITypedMessage
{
    public static string TypeString => "device-changed";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("action")]
    public required string Action { get; set; } // "added" or "removed"

    [JsonPropertyName("deviceInfo")]
    public required DeviceInfo Device { get; set; }
}

public class DeviceInfo
{
    [JsonPropertyName("uuid")]
    public required Guid Uuid { get; set; }

    [JsonPropertyName("displayName")]
    public required string DisplayName { get; set; }
}
