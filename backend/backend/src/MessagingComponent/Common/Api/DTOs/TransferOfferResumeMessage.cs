using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Common.Api.DTOs;

/// <summary>
/// Asks the other side of an offer to take it up again after a lost server connection.
/// The client sends the offer ID and <see cref="To"/>, the peer gets it with <see cref="From"/> set.
/// A receiver answers it with one of its own, a sender by sending the offer again.
/// </summary>
public class TransferOfferResumeMessage : ITypedMessage
{
    public static string TypeString => "transfer-offer-resume";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("offerId")]
    public required string OfferId { get; set; }

    [JsonPropertyName("to")]
    public string? To { get; set; }

    [JsonPropertyName("from")]
    public string? From { get; set; }
}
