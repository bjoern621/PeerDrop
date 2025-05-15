using backend.SignalingComponent.Common.Datatype;

namespace backend.SignalingComponent.Logic.Api;

public interface ISignalingService
{
    Task HandleRemoteTokenMessage(string clientId, RemoteTokenMessage message);
    Task HandleIceCandidateMessage(string clientId, IceCandidateMessage message);
    Task HandleSdpMessage(string clientId, SdpMessage message);
}