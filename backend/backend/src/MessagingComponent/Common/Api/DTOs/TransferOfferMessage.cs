using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Common.Api.DTOs;

/// <summary>
/// Offers the client <see cref="To"/> a first file transfer. Its encrypted summary stays opaque to the server.
/// The server forwards it as an <see cref="IncomingTransferOfferMessage"/> and answers with a <see cref="TransferOfferResultMessage"/>.
/// </summary>
public class TransferOfferMessage : ITypedMessage
{
    public static string TypeString => "transfer-offer";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    /// <summary>
    /// Chosen by the sender, at most 64 characters, unique among its pending offers.
    /// </summary>
    [JsonPropertyName("offerId")]
    public required string OfferId { get; set; }

    [JsonPropertyName("to")]
    public required string To { get; set; }

    /// <summary>
    /// Base64 of the 12-byte AES-GCM nonce.
    /// </summary>
    [JsonPropertyName("iv")]
    public required string Iv { get; set; }

    /// <summary>
    /// Base64 of the AES-GCM output, at most 16 KiB of base64.
    /// </summary>
    [JsonPropertyName("ciphertext")]
    public required string Ciphertext { get; set; }
}
