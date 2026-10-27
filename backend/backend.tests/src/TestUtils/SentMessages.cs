using backend.WebSocketComponent.Common.Api.DTOs;
using backend.TokenComponent.Logic.Api;
using Moq;

namespace backend.tests.TestUtils;

/// <summary>
/// Records the messages a mocked <see cref="IClientRegistry"/> sends, for the message types passed to <see cref="Capture{T}"/>.
/// </summary>
public class SentMessages
{
    // ITypedMessage carries a static abstract member, so it cannot stand as a
    // generic argument of Moq's Callback overloads.
    private delegate void SendMessageCallback(string recipientToken, ITypedMessage message);

    private readonly List<(string Recipient, object Message)> _messages = [];

    public SentMessages Capture<T>(Mock<IClientRegistry> handler) where T : ITypedMessage
    {
        handler
            .Setup(h => h.SendMessage(It.IsAny<string>(), It.IsAny<T>()))
            .Callback(new SendMessageCallback((recipientToken, message) => _messages.Add((recipientToken, (object)message))))
            .ReturnsAsync(true);

        return this;
    }

    public List<T> To<T>(string recipientToken) =>
        [.. _messages.Where(m => m.Recipient == recipientToken).Select(m => m.Message).OfType<T>()];

    public int Count => _messages.Count;
}
