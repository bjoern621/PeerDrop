using System.Text.Json.Serialization;

namespace backend.TokenComponent.Common.Api.DTOs;

/// <summary>
/// First message of every connection. Asks for a token, which the server may replace with another one.
/// </summary>
public class HelloMessage
{
    public static string TypeString => "hello";

    /// <summary>
    /// Null asks for no particular token.
    /// </summary>
    [JsonPropertyName("requestedToken")]
    public string? RequestedToken { get; set; }

    /// <summary>
    /// The key that came with <see cref="RequestedToken"/> on an earlier connection.
    /// It takes the token from that connection even while it stays open.
    /// </summary>
    [JsonPropertyName("reclaimKey")]
    public string? ReclaimKey { get; set; }
}
