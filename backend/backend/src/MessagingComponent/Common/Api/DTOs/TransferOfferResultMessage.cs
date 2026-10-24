using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Common.Api.DTOs;

public class TransferOfferResultMessage : ITypedMessage
{
    public static string TypeString => "transfer-offer-result";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    public const string STATUS_DELIVERED = "delivered";
    public const string STATUS_UNKNOWN = "unknown";
    public const string STATUS_RATE_LIMITED = "rate-limited";

    [JsonPropertyName("offerId")]
    public required string OfferId { get; set; }

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
