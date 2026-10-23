using System.Text.Json.Serialization;

namespace backend.SignalingComponent.Common.Api.DTOs;

/// <summary>
/// One entry of <c>RTCConfiguration.iceServers</c>, serialized in the shape the browser takes.
/// </summary>
public class IceServer
{
    [JsonPropertyName("urls")]
    public required IReadOnlyList<string> Urls { get; init; }

    // Absent for STUN: the browser would read null as the string "null".
    [JsonPropertyName("username")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Username { get; init; }

    [JsonPropertyName("credential")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Credential { get; init; }
}
