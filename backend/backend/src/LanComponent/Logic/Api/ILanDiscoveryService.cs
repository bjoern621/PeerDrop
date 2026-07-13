using backend.LanComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.LanComponent.Logic.Api;

/// <summary>
/// Tracks connected clients grouped by the public IP address they connected
/// from and pushes the resulting peer list to every client in a network as it
/// changes. Clients sharing a public IP are treated as being on the same LAN.
/// A peer is reported as "busy" while it is in an active peer connection.
/// </summary>
public interface ILanDiscoveryService
{
    /// <summary>
    /// Registers a newly connected client and notifies its network of the change.
    /// </summary>
    public Task HandleClientConnected(ClientConnectedEvent connectedEvent);

    /// <summary>
    /// Removes a disconnected client and notifies its former network of the
    /// change. If the client was in a peer connection, its partner is marked
    /// available again.
    /// </summary>
    public Task HandleClientDisconnected(string clientToken);

    /// <summary>
    /// Sends the requesting client its current peer list.
    /// </summary>
    public Task HandleLanPeersRequest(string clientToken, RequestLanPeersMessage message);

    /// <summary>
    /// Marks both clients as busy and notifies their networks.
    /// </summary>
    public Task HandleConnectionEstablished(string clientTokenA, string clientTokenB);

    /// <summary>
    /// Marks the client and its connection partner as available again and
    /// notifies their networks. Ignored if the client is not in a tracked
    /// peer connection.
    /// </summary>
    public Task HandleConnectionClosed(string clientToken);
}
