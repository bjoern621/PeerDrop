using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Common.Api.DTOs;

/// <summary>
/// Withdraws a pending offer. The sender sends the offer ID alone.
/// The receiver gets it with <see cref="From"/> set, also when the sender disconnects.
/// </summary>
public class TransferOfferCancelMessage : ITypedMessage
{
    public static string TypeString => "transfer-offer-cancel";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("offerId")]
    public required string OfferId { get; set; }

    [JsonPropertyName("from")]
    public string? From { get; set; }
}
