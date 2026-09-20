using backend.LanComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.LanComponent.Logic.Api;

/// <summary>
/// Tracks connected clients grouped by the public IP address they connected
/// from and pushes the resulting peer list to every client in a network as it
/// changes. Clients sharing a public IP are treated as being on the same LAN.
/// A peer is reported as "busy" from the start of a peer connection until it
/// reports leaving the session, which outlasts the connection on the side that
/// keeps the transfer screen.
/// A client stays out of every peer list until it reports discovery as switched on.
/// </summary>
public interface ILanDiscoveryService
{
    /// <summary>
    /// Registers a newly connected client, hidden from its network until the
    /// client reports its discovery state.
    /// </summary>
    public Task HandleClientConnected(ClientConnectedEvent connectedEvent);

    /// <summary>
    /// Removes a disconnected client and notifies its former network of the
    /// change. Its connection partner keeps the files it received and stays
    /// busy until it reports leaving the session.
    /// </summary>
    public Task HandleClientDisconnected(string clientToken);

    /// <summary>
    /// Sends the requesting client its current peer list.
    /// Empty while the client has discovery switched off.
    /// </summary>
    public Task HandleLanPeersRequest(string clientToken, RequestLanPeersMessage message);

    /// <summary>
    /// Takes over the client's discovery state and notifies its network.
    /// Discovery switched off hides the client from the other clients and clears its own peer list.
    /// Switching it on shows the client and fills its peer list, without a reconnect.
    /// </summary>
    public Task HandleLanDiscoveryState(string clientToken, LanDiscoveryStateMessage message);

    /// <summary>
    /// Marks both clients as busy and notifies their networks.
    /// </summary>
    public Task HandleConnectionEstablished(string clientTokenA, string clientTokenB);

    /// <summary>
    /// Marks the client as available again and notifies its network. Its
    /// former partner stays busy until it reports leaving the session as well,
    /// as it keeps the received files on the transfer screen. Ignored if the
    /// client is not in a tracked peer connection.
    /// </summary>
    public Task HandleSessionLeft(string clientToken);
}
