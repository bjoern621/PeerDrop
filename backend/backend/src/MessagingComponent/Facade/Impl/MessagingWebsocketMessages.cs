using backend.MessagingComponent.Common.Api.DTOs;
using backend.MessagingComponent.Facade.Api;
using backend.MessagingComponent.Logic.Api;
using backend.TokenComponent.Logic.Api;

namespace backend.MessagingComponent.Facade.Impl;

public class MessagingWebsocketMessages(
    IClientRegistry _clientRegistry,
    ITokenLookupService _tokenLookupService,
    ITextService _textService,
    ITransferOfferService _transferOfferService,
    IAbuseGuard _abuseGuard) : IMessagingWebsocketMessages
{
    public void SubscribeToMessageHandlers()
    {
        _clientRegistry.SubscribeToMessageType<PublicKeyMessage>(PublicKeyMessage.TypeString, _tokenLookupService.HandlePublicKey);

        _clientRegistry.SubscribeToMessageType<TokenLookupMessage>(TokenLookupMessage.TypeString, _tokenLookupService.HandleTokenLookup);

        _clientRegistry.SubscribeToMessageType<TextMessage>(TextMessage.TypeString, _textService.HandleText);

        _clientRegistry.SubscribeToMessageType<TransferOfferMessage>(TransferOfferMessage.TypeString, _transferOfferService.HandleTransferOffer);

        _clientRegistry.SubscribeToMessageType<TransferOfferCancelMessage>(TransferOfferCancelMessage.TypeString, _transferOfferService.HandleTransferOfferCancel);

        _clientRegistry.SubscribeToMessageType<TransferAnswerMessage>(TransferAnswerMessage.TypeString, _transferOfferService.HandleTransferAnswer);

        _clientRegistry.SubscribeToMessageType<TransferOfferResumeMessage>(TransferOfferResumeMessage.TypeString, _transferOfferService.HandleTransferOfferResume);

        _clientRegistry.ClientDisconnected += _transferOfferService.HandleClientDisconnected;

        _clientRegistry.ClientDisconnected += _tokenLookupService.HandleClientDisconnected;

        _clientRegistry.ClientDisconnected += clientToken =>
        {
            _abuseGuard.ForgetToken(clientToken);
            return Task.CompletedTask;
        };
    }
}
