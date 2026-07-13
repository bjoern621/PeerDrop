using System.Text.Json.Serialization;

namespace backend.LanComponent.Common.Api.DTOs;

/// <summary>
/// A single peer discovered in the same local network, as sent to clients.
/// </summary>
public class LanPeerDTO
{
    /// <summary>Connection token of the peer, used to request a connection.</summary>
    [JsonPropertyName("token")]
    public required string Token { get; set; }

    /// <summary>Operating system derived from the peer's user agent, e.g. "Windows". Null if not recognized.</summary>
    [JsonPropertyName("os")]
    public string? Os { get; set; }

    /// <summary>Browser derived from the peer's user agent, e.g. "Chrome". Null if not recognized.</summary>
    [JsonPropertyName("browser")]
    public string? Browser { get; set; }

    /// <summary>"online" if the peer is available, "busy" if it is currently in a peer connection.</summary>
    [JsonPropertyName("status")]
    public required string Status { get; set; }
}
