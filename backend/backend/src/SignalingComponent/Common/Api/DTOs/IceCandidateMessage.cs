using System.Text.Json;
using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.SignalingComponent.Common.Api.DTOs;

public class IceCandidateMessage : ITypedMessage
{
    public static string TypeString => "ice-candidate";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("remoteToken")]
    public required string RemoteToken { get; set; }

    [JsonPropertyName("iceCandidate")]
    public JsonElement IceCandidate { get; set; }

}