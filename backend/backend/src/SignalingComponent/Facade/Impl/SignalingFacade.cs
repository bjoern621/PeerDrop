using backend.SignalingComponent.Common.Api.DTOs;
using backend.SignalingComponent.Facade.Api;
using backend.SignalingComponent.Logic.Api;
using backend.TokenComponent.Logic.Api;

namespace backend.SignalingComponent.Facade.Impl;

public class SignalingFacade : ISignalingFacade
{
    private readonly IClientRegistry _clientRegistry;
    private readonly ISignalingService _signalingService;

    public SignalingFacade(IClientRegistry clientRegistry, ISignalingService signalingService)
    {
        _clientRegistry = clientRegistry;
        _signalingService = signalingService;
    }

    public void SubscribeToMessageHandlers()
    {
        _clientRegistry.SubscribeToMessageType<IceCandidateMessage>(IceCandidateMessage.TypeString, _signalingService.HandleIceCandidateMessage);

        _clientRegistry.SubscribeToMessageType<SdpMessage>(SdpMessage.TypeString, _signalingService.HandleSdpMessage);
    }
}
