using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.ConnectionComponent.Common.Api.DTOs;

public class CloseConnectionMessage : ITypedMessage
{
    public static string TypeString => "close-connection";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("remoteToken")]
    public required string RemoteToken { get; set; }
}
