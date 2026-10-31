using backend.MessagingComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Logic.Api;

public interface ITransferOfferService
{
    /// <summary>
    /// Stores the offer as pending, forwards it to its receiver and answers the sender with a transfer-offer-result.
    /// A receiver that is not online costs a try of the unknown-token budget.
    /// While that budget is locked, the offer gets answered as unknown without checking the receiver.
    /// Ignored if a field is malformed, the ciphertext exceeds 16 KiB, the offer targets the sender
    /// or its ID is already pending.
    /// </summary>
    Task HandleTransferOffer(string clientToken, TransferOfferMessage message);

    /// <summary>
    /// Withdraws a pending offer of the sender and tells the receiver.
    /// Ignored if the sender has no pending offer with that ID.
    /// </summary>
    Task HandleTransferOfferCancel(string clientToken, TransferOfferCancelMessage message);

    /// <summary>
    /// Forwards the receiver's answer to the offer's sender, marked gone if the receiver declined on leaving.
    /// An accepted offer permits the sender to send to the receiver and initiates their connection unless it exists.
    /// Ignored if the receiver has no pending offer with that ID.
    /// </summary>
    Task HandleTransferAnswer(string clientToken, TransferAnswerMessage message);

    /// <summary>
    /// Forwards the request to take an offer up again to <see cref="TransferOfferResumeMessage.To"/>.
    /// Sends nothing back, so the requester learns nothing about the peer.
    /// Ignored if a field is malformed, the request targets the requester, the peer is not online
    /// or the requester exceeded its offer cap.
    /// </summary>
    Task HandleTransferOfferResume(string clientToken, TransferOfferResumeMessage message);

    /// <summary>
    /// Ends the pending offers of a disconnected client.
    /// The receivers of its offers get a cancel, the senders of offers to it an unaccepted answer marked gone.
    /// Both get marked as from a client that may return.
    /// </summary>
    Task HandleClientDisconnected(string clientToken);
}
