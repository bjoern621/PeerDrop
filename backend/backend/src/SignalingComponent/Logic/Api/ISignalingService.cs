using backend.SignalingComponent.Common.Api.DTOs;

namespace backend.SignalingComponent.Logic.Api;

/// <summary>
/// Relays WebRTC signaling between the two clients of a connected pair.
/// Messages to any other client get dropped.
/// </summary>
public interface ISignalingService
{
    Task HandleIceCandidateMessage(string clientId, IceCandidateMessage message);
    Task HandleSdpMessage(string clientId, SdpMessage message);
}
