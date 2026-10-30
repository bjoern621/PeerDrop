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
    /// Records the client's claim to resume its connection to the named partner and forwards it to the partner.
    /// The pair counts as connected once both sides claimed it. Permissions stay as they are.
    /// Ignored if the partner is offline or the client itself, if the pair is connected or if the claim waits already.
    /// </summary>
    Task HandleResumeConnection(string clientToken, ResumeConnectionMessage message);

    /// <summary>
    /// Drops the client's permissions, connected pairs and resume claims.
    /// Each former connection partner receives a close-connection naming the client, marked as gone.
    /// </summary>
    Task HandleClientDisconnected(string clientToken);
}
