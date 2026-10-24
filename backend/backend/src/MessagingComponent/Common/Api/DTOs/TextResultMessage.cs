using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Common.Api.DTOs;

public class TextResultMessage : ITypedMessage
{
    public static string TypeString => "text-result";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    public const string STATUS_DELIVERED = "delivered";
    public const string STATUS_UNDELIVERED = "undelivered";
    public const string STATUS_RATE_LIMITED = "rate-limited";
    public const string STATUS_TOO_LARGE = "too-large";
    public const string STATUS_UNKNOWN = "unknown";

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// One of the STATUS_ constants.
    /// </summary>
    [JsonPropertyName("status")]
    public required string Status { get; set; }

    /// <summary>
    /// Milliseconds until the sender may try again. Null where waiting does not help.
    /// </summary>
    [JsonPropertyName("retryAfterMs")]
    public long? RetryAfterMs { get; set; }
}
