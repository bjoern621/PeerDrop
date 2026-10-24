using backend.ConnectionComponent.Common.Api.DTOs;

namespace backend.ConnectionComponent.Logic.Api;

public interface IPeerConnectionService
{
    /// <summary>
    /// Initiates a connection to the target if a permission exists between the two clients in either direction,
    /// or if both are signed in with the same account, which records permissions in both directions.
    /// Ignored if neither holds, the target is offline or the pair is already connected.
    /// </summary>
    Task HandlePeerConnect(string clientToken, PeerConnectMessage message);

    /// <summary>
    /// Removes the connected pair and forwards the close to the partner.
    /// Ignored if the two clients are not connected. The permission between them stays.
    /// </summary>
    Task HandleCloseConnection(string clientToken, CloseConnectionMessage message);

    /// <summary>
    /// Drops the client's permissions and connected pairs.
    /// Each former connection partner receives a close-connection naming the client.
    /// </summary>
    Task HandleClientDisconnected(string clientToken);
}
