using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.DTOs.Api;

namespace backend.SignalingComponent.Common.DTOs;

public class ConnectionRequestCancelledMessage : ITypedMessage
{
    public static string TypeString => "connection-request-cancelled";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("remoteToken")]
    public string? RemoteToken { get; set; }
}