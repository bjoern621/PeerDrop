using backend.SignalingComponent.Common.Api.DTOs;

namespace backend.SignalingComponent.Logic.Api;

public interface ISignalingService
{
    Task HandleRemoteTokenMessage(string clientId, RemoteTokenMessage message);
    Task HandleIceCandidateMessage(string clientId, IceCandidateMessage message);
    Task HandleSdpMessage(string clientId, SdpMessage message);
    Task HandleCloseConnection(string clientId, CloseConnectionMessage message);
    Task HandleConnectionRequest(string clientId, ConnectionRequestMessage message);
    Task HandleConnectionResponse(string clientId, ConnectionResponseMessage message);
    Task HandleConnectionRequestCancelled(string clientToken, ConnectionRequestCancelledMessage messageData);
    Task HandleQuickConnectMessage(string clientToken, QuickConnectMessage message);
}