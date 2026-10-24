using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Common.Api.DTOs;

public class TokenStatusMessage : ITypedMessage
{
    public static string TypeString => "token-status";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    /// <summary>
    /// The requested token in lowercase, or the device's client token for a device lookup.
    /// Empty for a device lookup that found no online client.
    /// </summary>
    [JsonPropertyName("token")]
    public required string Token { get; set; }

    /// <summary>
    /// The requested device UUID, null for a token lookup.
    /// </summary>
    [JsonPropertyName("deviceUuid")]
    public Guid? DeviceUuid { get; set; }

    [JsonPropertyName("online")]
    public required bool Online { get; set; }

    /// <summary>
    /// Null while the client has not announced a key.
    /// </summary>
    [JsonPropertyName("publicKey")]
    public string? PublicKey { get; set; }

    /// <summary>
    /// True if both clients are signed in with the same account.
    /// </summary>
    [JsonPropertyName("ownDevice")]
    public required bool OwnDevice { get; set; }

    /// <summary>
    /// Milliseconds until the requester may look up unknown tokens again. Null while it may.
    /// </summary>
    [JsonPropertyName("retryAfterMs")]
    public long? RetryAfterMs { get; set; }
}
