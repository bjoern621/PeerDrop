using System.Text.Json.Serialization;

namespace backend.LanComponent.Common.Api.DTOs;

/// <summary>
/// A single peer discovered in the same local network, as sent to clients.
/// </summary>
public class LanPeerDTO
{
    /// <summary>Client token of the peer, used to send to it.</summary>
    [JsonPropertyName("token")]
    public required string Token { get; set; }

    /// <summary>Operating system derived from the peer's user agent, e.g. "Windows". Null if not recognized.</summary>
    [JsonPropertyName("os")]
    public string? Os { get; set; }

    /// <summary>Browser derived from the peer's user agent, e.g. "Chrome". Null if not recognized.</summary>
    [JsonPropertyName("browser")]
    public string? Browser { get; set; }
}
