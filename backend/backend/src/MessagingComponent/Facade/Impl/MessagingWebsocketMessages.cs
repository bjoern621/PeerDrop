using backend.MessagingComponent.Common.Api.DTOs;
using backend.MessagingComponent.Facade.Api;
using backend.MessagingComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.MessagingComponent.Facade.Impl;

public class MessagingWebsocketMessages(
    IWebSocketHandler _webSocketHandler,
    ITokenLookupService _tokenLookupService,
    ITextService _textService,
    ITransferOfferService _transferOfferService,
    IAbuseGuard _abuseGuard) : IMessagingWebsocketMessages
{
    public void SubscribeToMessageHandlers()
    {
        _webSocketHandler.SubscribeToMessageType<PublicKeyMessage>(PublicKeyMessage.TypeString, _tokenLookupService.HandlePublicKey);

        _webSocketHandler.SubscribeToMessageType<TokenLookupMessage>(TokenLookupMessage.TypeString, _tokenLookupService.HandleTokenLookup);

        _webSocketHandler.SubscribeToMessageType<TextMessage>(TextMessage.TypeString, _textService.HandleText);

        _webSocketHandler.SubscribeToMessageType<TransferOfferMessage>(TransferOfferMessage.TypeString, _transferOfferService.HandleTransferOffer);

        _webSocketHandler.SubscribeToMessageType<TransferOfferCancelMessage>(TransferOfferCancelMessage.TypeString, _transferOfferService.HandleTransferOfferCancel);

        _webSocketHandler.SubscribeToMessageType<TransferAnswerMessage>(TransferAnswerMessage.TypeString, _transferOfferService.HandleTransferAnswer);

        _webSocketHandler.ClientDisconnected += _transferOfferService.HandleClientDisconnected;

        _webSocketHandler.ClientDisconnected += _tokenLookupService.HandleClientDisconnected;

        _webSocketHandler.ClientDisconnected += clientToken =>
        {
            _abuseGuard.ForgetToken(clientToken);
            return Task.CompletedTask;
        };
    }
}
