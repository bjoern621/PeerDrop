using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.ConnectionComponent.Common.Api.DTOs;

public class ConnectionRequestCancelledMessage : ITypedMessage
{
    public static string TypeString => "connection-request-cancelled";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("remoteToken")]
    public string? RemoteToken { get; set; }
}