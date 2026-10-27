using backend.MessagingComponent.Common.Api.DTOs;
using backend.MessagingComponent.Common.Api.Validators;
using backend.MessagingComponent.Dataaccess.Api;
using backend.MessagingComponent.Logic.Api;
using backend.MessagingComponent.Logic.Types;
using backend.TelemetryComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.MessagingComponent.Logic.Impl;

public class TextService(
    IWebSocketHandler _webSocketHandler,
    IPublicKeyRepository _publicKeys,
    IAbuseGuard _abuseGuard,
    IUsageMetrics _usageMetrics,
    ILogger<TextService> _logger) : ITextService
{
    public async Task HandleText(string clientToken, TextMessage message)
    {
        if (!EncryptedMessageValidator.IsValidId(message.Id)
            || string.IsNullOrEmpty(message.To)
            || !EncryptedMessageValidator.IsValidIv(message.Iv)
            || message.Ciphertext == null)
        {
            _logger.LogDebug($"Received malformed text from {clientToken}, ignoring.");
            return;
        }

        var (status, retryAfter) = await DeliverText(clientToken, message.To.ToLowerInvariant(), message);

        _usageMetrics.TextHandled(status);
        await _webSocketHandler.SendMessage(clientToken, new TextResultMessage
        {
            Id = message.Id,
            Status = status,
            RetryAfterMs = RetryAfter.ToMilliseconds(retryAfter),
        });
    }

    private async Task<(string Status, TimeSpan? RetryAfter)> DeliverText(string clientToken, string receiverToken, TextMessage message)
    {
        if (message.Ciphertext.Length > EncryptedMessageValidator.MaxTextCiphertextChars)
            return (TextResultMessage.STATUS_TOO_LARGE, null);

        // A locked requester learns nothing about the receiver, delivered or not.
        var requesterIp = _webSocketHandler.GetRemoteIpAddressForClientToken(clientToken);
        var lockRemaining = _abuseGuard.GetUnknownTokenLock(clientToken, requesterIp);
        if (lockRemaining != null)
            return (TextResultMessage.STATUS_UNKNOWN, lockRemaining);

        var textWait = _abuseGuard.GetTextWait(clientToken);
        if (textWait != null)
            return (TextResultMessage.STATUS_RATE_LIMITED, textWait);

        if (!_webSocketHandler.RemoteTokenExists(receiverToken))
            return (TextResultMessage.STATUS_UNKNOWN, _abuseGuard.RecordUnknownTokenMiss(clientToken, requesterIp));

        if (_abuseGuard.IsReceiverTextCapReached(receiverToken))
        {
            _logger.LogDebug($"Text from {clientToken} to {receiverToken}, but the receiver reached its text cap. Dropping text.");
            return (TextResultMessage.STATUS_UNDELIVERED, null);
        }

        var forwarded = await _webSocketHandler.SendMessage(receiverToken, new IncomingTextMessage
        {
            From = clientToken,
            FromKey = _publicKeys.Get(clientToken),
            Iv = message.Iv,
            Ciphertext = message.Ciphertext,
        });

        if (!forwarded)
            return (TextResultMessage.STATUS_UNDELIVERED, null);

        _abuseGuard.RecordTextDelivered(clientToken, receiverToken);
        _logger.LogDebug($"to {receiverToken}: Text from {clientToken}");
        return (TextResultMessage.STATUS_DELIVERED, null);
    }
}
