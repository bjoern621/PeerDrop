using backend.ConnectionComponent.Common.Api.DTOs;

namespace backend.ConnectionComponent.Logic.Api;

public interface ITokenConnectService
{
    Task HandleCloseConnection(string clientId, CloseConnectionMessage message);
    /// <summary>
    /// Wird aufgerufen, wenn ein Client eine Token-Verbindungsanfrage <see cref="backend.ConnectionComponent.Common.Api.DTOs.ConnectionRequestMessage"/> über den WebSocket sendet.
    /// </summary>
    Task HandleConnectionRequest(string clientId, ConnectionRequestMessage message);
    Task HandleConnectionResponse(string clientId, ConnectionResponseMessage message);
    Task HandleConnectionRequestCancelled(string clientToken, ConnectionRequestCancelledMessage messageData);
    /// <summary>
    /// Cleans up open connection requests when a client disconnects: the
    /// client's own open request is dropped and all requesters waiting for the
    /// client receive a rejection response.
    /// </summary>
    Task HandleClientDisconnected(string clientToken);
}