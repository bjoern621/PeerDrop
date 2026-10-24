using backend.MessagingComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Logic.Api;

public interface ITextService
{
    /// <summary>
    /// Forwards an encrypted text to its receiver and answers the sender with a text-result.
    /// Checks in this order: ciphertext size, the sender's unknown-token lock (answered as unknown without checking the receiver),
    /// the sender's text bucket, whether the receiver is online (a miss costs a try of the unknown-token budget), the receiver's cap.
    /// Ignored if the ID, receiver or IV is malformed.
    /// </summary>
    Task HandleText(string clientToken, TextMessage message);
}
