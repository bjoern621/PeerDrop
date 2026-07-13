namespace backend.WebSocketComponent.Common.Api.DTOs;

/// <summary>
/// Payload raised when a client opens a WebSocket connection. Carries the
/// connection context that other components (e.g. LAN discovery) need without
/// exposing the underlying socket.
/// </summary>
public class ClientConnectedEvent
{
    public required string ClientToken { get; init; }

    /// <summary>Remote IP address the client connected from, or null if unknown.</summary>
    public string? RemoteIpAddress { get; init; }

    /// <summary>User-Agent header sent by the client, or null if none was sent.</summary>
    public string? UserAgent { get; init; }
}
