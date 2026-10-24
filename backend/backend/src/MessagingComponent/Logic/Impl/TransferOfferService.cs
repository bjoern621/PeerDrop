using backend.ConnectionComponent.Dataaccess.Api;
using backend.ConnectionComponent.Logic.Api;
using backend.MessagingComponent.Common.Api.DTOs;
using backend.MessagingComponent.Common.Api.Validators;
using backend.MessagingComponent.Dataaccess.Api;
using backend.MessagingComponent.Logic.Api;
using backend.MessagingComponent.Logic.Types;
using backend.TelemetryComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.MessagingComponent.Logic.Impl;

public class TransferOfferService(
    IWebSocketHandler _webSocketHandler,
    IAbuseGuard _abuseGuard,
    IPendingOfferRepository _pendingOfferRepository,
    IPairRepository _pairRepository,
    IConnectionInitiationService _connectionInitiationService,
    IUsageMetrics _usageMetrics,
    ILogger<TransferOfferService> _logger) : ITransferOfferService
{
    public async Task HandleTransferOffer(string clientToken, TransferOfferMessage message)
    {
        if (!EncryptedMessageValidator.IsValidId(message.OfferId)
            || string.IsNullOrEmpty(message.To)
            || !EncryptedMessageValidator.IsValidIv(message.Iv)
            || message.Ciphertext == null
            || message.Ciphertext.Length > EncryptedMessageValidator.MaxOfferCiphertextChars)
        {
            _logger.LogDebug($"Received malformed transfer offer from {clientToken}, ignoring.");
            return;
        }

        var receiverToken = message.To.ToLowerInvariant();
        if (string.Equals(receiverToken, clientToken, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogDebug($"Received transfer offer from {clientToken} to itself, ignoring.");
            return;
        }

        var (status, retryAfter) = await DeliverOffer(clientToken, receiverToken, message);
        if (status == null)
            return;

        _usageMetrics.TransferOffered(status);
        await _webSocketHandler.SendMessage(clientToken, new TransferOfferResultMessage
        {
            OfferId = message.OfferId,
            Status = status,
            RetryAfterMs = RetryAfter.ToMilliseconds(retryAfter),
        });
    }

    /// <summary>
    /// Returns the status for the transfer-offer-result, or null if the offer gets ignored.
    /// </summary>
    private async Task<(string? Status, TimeSpan? RetryAfter)> DeliverOffer(string clientToken, string receiverToken, TransferOfferMessage message)
    {
        // A locked requester learns nothing about the receiver, delivered or not.
        var requesterIp = _webSocketHandler.GetRemoteIpAddressForClientToken(clientToken);
        var lockRemaining = _abuseGuard.GetUnknownTokenLock(clientToken, requesterIp);
        if (lockRemaining != null)
            return (TransferOfferResultMessage.STATUS_UNKNOWN, lockRemaining);

        if (!_webSocketHandler.RemoteTokenExists(receiverToken))
            return (TransferOfferResultMessage.STATUS_UNKNOWN, _abuseGuard.RecordUnknownTokenMiss(clientToken, requesterIp));

        var offerWait = _abuseGuard.TryRecordOffer(clientToken);
        if (offerWait != null)
            return (TransferOfferResultMessage.STATUS_RATE_LIMITED, offerWait);

        var offer = new PendingOffer(message.OfferId, clientToken, receiverToken);
        if (!_pendingOfferRepository.TryAdd(offer))
        {
            _logger.LogDebug($"Transfer offer {message.OfferId} from {clientToken} is already pending, ignoring.");
            return (null, null);
        }

        var forwarded = await _webSocketHandler.SendMessage(receiverToken, new IncomingTransferOfferMessage
        {
            OfferId = message.OfferId,
            From = clientToken,
            FromKey = _webSocketHandler.GetPublicKeyForClientToken(clientToken),
            Iv = message.Iv,
            Ciphertext = message.Ciphertext,
        });

        if (!forwarded)
        {
            _pendingOfferRepository.TryRemoveBySender(clientToken, message.OfferId, out _);
            return (TransferOfferResultMessage.STATUS_UNKNOWN, null);
        }

        _logger.LogDebug($"to {receiverToken}: Transfer Offer {message.OfferId} from {clientToken}");
        return (TransferOfferResultMessage.STATUS_DELIVERED, null);
    }

    public async Task HandleTransferOfferCancel(string clientToken, TransferOfferCancelMessage message)
    {
        if (message.OfferId == null || !_pendingOfferRepository.TryRemoveBySender(clientToken, message.OfferId, out var offer))
        {
            _logger.LogDebug($"Transfer offer {message.OfferId} cancelled by {clientToken}, but no pending offer found.");
            return;
        }

        await SendCancel(offer);
    }

    public async Task HandleTransferAnswer(string clientToken, TransferAnswerMessage message)
    {
        if (message.OfferId == null || !_pendingOfferRepository.TryRemoveByReceiver(clientToken, message.OfferId, out var offer))
        {
            _logger.LogDebug($"Transfer answer from {clientToken} for offer {message.OfferId}, but no pending offer found. Ignoring.");
            return;
        }

        _usageMetrics.TransferAnswered(message.Accepted);

        await _webSocketHandler.SendMessage(offer.SenderToken, new TransferAnswerMessage
        {
            OfferId = offer.OfferId,
            From = offer.ReceiverToken,
            Accepted = message.Accepted,
            Gone = false,
        });
        _logger.LogDebug($"to {offer.SenderToken}: Transfer Answer from {offer.ReceiverToken} (Accepted: {message.Accepted})");

        if (!message.Accepted)
            return;

        _pairRepository.AddPermission(offer.SenderToken, offer.ReceiverToken);
        await _connectionInitiationService.InitiateConnection(offer.SenderToken, offer.ReceiverToken, "offer");
    }

    public async Task HandleClientDisconnected(string clientToken)
    {
        var token = clientToken.ToLowerInvariant();

        foreach (var offer in _pendingOfferRepository.RemoveAllOf(clientToken))
        {
            if (offer.SenderToken == token)
            {
                await SendCancel(offer);
            }
            else
            {
                await _webSocketHandler.SendMessage(offer.SenderToken, new TransferAnswerMessage
                {
                    OfferId = offer.OfferId,
                    From = offer.ReceiverToken,
                    Accepted = false,
                    Gone = true,
                });
                _logger.LogDebug($"to {offer.SenderToken}: Transfer Answer: Receiver {offer.ReceiverToken} disconnected");
            }
        }
    }

    private async Task SendCancel(PendingOffer offer)
    {
        await _webSocketHandler.SendMessage(offer.ReceiverToken, new TransferOfferCancelMessage
        {
            OfferId = offer.OfferId,
            From = offer.SenderToken,
        });
        _logger.LogDebug($"to {offer.ReceiverToken}: Transfer Offer Cancel {offer.OfferId} from {offer.SenderToken}");
    }
}
