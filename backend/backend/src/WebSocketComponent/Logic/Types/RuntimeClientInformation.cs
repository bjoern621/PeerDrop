
using System.Net.WebSockets;

namespace backend.WebSocketComponent.Logic.Types;

public class RuntimeClientInformation
{
    public required WebSocket WebSocket { get; set; }
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
}
