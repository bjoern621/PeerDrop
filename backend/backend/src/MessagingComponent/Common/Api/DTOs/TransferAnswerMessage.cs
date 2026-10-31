using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Common.Api.DTOs;

/// <summary>
/// The receiver's answer to a pending offer. The receiver sends the offer ID, <see cref="Accepted"/>
/// and, when it leaves, <see cref="Gone"/>. The sender gets it with <see cref="From"/> set.
/// </summary>
public class TransferAnswerMessage : ITypedMessage
{
    public static string TypeString => "transfer-answer";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("offerId")]
    public required string OfferId { get; set; }

    [JsonPropertyName("from")]
    public string? From { get; set; }

    [JsonPropertyName("accepted")]
    public required bool Accepted { get; set; }

    /// <summary>
    /// True if the receiver left or disconnected before answering. <see cref="Accepted"/> is false then.
    /// </summary>
    [JsonPropertyName("gone")]
    public bool Gone { get; set; }

    /// <summary>
    /// True if the receiver lost its server connection. It may take the offer up again, see <see cref="TransferOfferResumeMessage"/>.
    /// </summary>
    [JsonPropertyName("mayReturn")]
    public bool MayReturn { get; set; }
}
