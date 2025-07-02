using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.SignalingComponent.Common.Api.DTOs;

public class QuickConnectMessage : ITypedMessage
{
    public static string TypeString => "quick-connect";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("deviceUuid")]
    public required Guid DeviceUuid { get; set; }
}