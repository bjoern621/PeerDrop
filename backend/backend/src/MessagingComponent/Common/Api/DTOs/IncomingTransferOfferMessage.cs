using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Common.Api.DTOs;

/// <summary>
/// A <see cref="TransferOfferMessage"/> as the receiver gets it.
/// </summary>
public class IncomingTransferOfferMessage : ITypedMessage
{
    public static string TypeString => "transfer-offer";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("offerId")]
    public required string OfferId { get; set; }

    [JsonPropertyName("from")]
    public required string From { get; set; }

    /// <summary>
    /// The sender's public key. Null if the sender announced none.
    /// </summary>
    [JsonPropertyName("fromKey")]
    public string? FromKey { get; set; }

    [JsonPropertyName("iv")]
    public required string Iv { get; set; }

    [JsonPropertyName("ciphertext")]
    public required string Ciphertext { get; set; }
}
