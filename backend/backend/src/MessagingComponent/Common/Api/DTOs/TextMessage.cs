using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Common.Api.DTOs;

/// <summary>
/// An end-to-end encrypted text from the sending client to the client <see cref="To"/>.
/// The server forwards it as an <see cref="IncomingTextMessage"/> and answers with a <see cref="TextResultMessage"/>.
/// </summary>
public class TextMessage : ITypedMessage
{
    public static string TypeString => "text";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    /// <summary>
    /// Chosen by the sender, at most 64 characters. Echoed in the result.
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("to")]
    public required string To { get; set; }

    /// <summary>
    /// Base64 of the 12-byte AES-GCM nonce.
    /// </summary>
    [JsonPropertyName("iv")]
    public required string Iv { get; set; }

    /// <summary>
    /// Base64 of the AES-GCM output, tag included.
    /// </summary>
    [JsonPropertyName("ciphertext")]
    public required string Ciphertext { get; set; }
}
