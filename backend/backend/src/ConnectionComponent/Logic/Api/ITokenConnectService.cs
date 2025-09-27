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
}