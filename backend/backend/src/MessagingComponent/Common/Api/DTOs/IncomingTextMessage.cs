using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Common.Api.DTOs;

/// <summary>
/// A <see cref="TextMessage"/> as the receiver gets it.
/// </summary>
public class IncomingTextMessage : ITypedMessage
{
    public static string TypeString => "text";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("from")]
    public required string From { get; set; }

    /// <summary>
    /// The sender's public key, for deriving the shared key without a lookup. Null if the sender announced none.
    /// </summary>
    [JsonPropertyName("fromKey")]
    public string? FromKey { get; set; }

    [JsonPropertyName("iv")]
    public required string Iv { get; set; }

    [JsonPropertyName("ciphertext")]
    public required string Ciphertext { get; set; }
}
