using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.TokenComponent.Common.Api.DTOs;

/// <summary>
/// Hands the client its token together with the reclaim key, which lets a later connection of the same client take the token back.
/// </summary>
public class ClientTokenMessage : ITypedMessage
{
    public static string TypeString => "client-token";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("token")]
    public required string ClientToken { get; set; }

    [JsonPropertyName("reclaimKey")]
    public required string ReclaimKey { get; set; }
}
