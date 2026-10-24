using System.Net.WebSockets;

namespace backend.WebSocketComponent.Logic.Types;

public class RuntimeClientInformation
{
    public required WebSocket WebSocket { get; set; }

    /// <summary>
    /// Serializes sends on <see cref="WebSocket"/>, which allows one outstanding send at a time.
    /// </summary>
    public SemaphoreSlim SendLock { get; } = new(1, 1);

    public int? UserId { get; set; } // This is technically a violation of the single responsibility principle, but there is no other (secure) way to get the user ID from the client token.

    /// <summary>
    /// Remote IP address the client connected from. Used to group clients that
    /// share a public IP into the same local network for LAN discovery.
    /// Null if the address could not be determined.
    /// </summary>
    public string? RemoteIpAddress { get; set; }

    /// <summary>
    /// User-Agent header sent when the WebSocket connection was opened.
    /// Null if the client did not send one.
    /// </summary>
    public string? UserAgent { get; set; }

    /// <summary>
    /// Base64 of the client's raw P-256 public key, as last announced by the client.
    /// Null until the client sends one.
    /// </summary>
    public string? PublicKey { get; set; }
}
