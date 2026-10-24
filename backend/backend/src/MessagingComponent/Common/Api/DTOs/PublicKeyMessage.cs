using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Common.Api.DTOs;

/// <summary>
/// Announces the sending client's public key. A later message replaces it.
/// </summary>
public class PublicKeyMessage : ITypedMessage
{
    public static string TypeString => "public-key";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    /// <summary>
    /// Base64 of the raw uncompressed P-256 public key: 65 bytes, 88 characters.
    /// </summary>
    [JsonPropertyName("key")]
    public required string Key { get; set; }
}
