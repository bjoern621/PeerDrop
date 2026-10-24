using System.Diagnostics.CodeAnalysis;

namespace backend.MessagingComponent.Dataaccess.Api;

/// <summary>
/// Holds pending transfer offers in memory. Tokens compare case-insensitively.
/// Can be called concurrently.
/// </summary>
public interface IPendingOfferRepository
{
    /// <summary>
    /// Returns false and stores nothing if the offer ID is already pending for the sender or for the receiver.
    /// </summary>
    bool TryAdd(PendingOffer offer);

    bool TryRemoveBySender(string senderToken, string offerId, [MaybeNullWhen(false)] out PendingOffer offer);

    bool TryRemoveByReceiver(string receiverToken, string offerId, [MaybeNullWhen(false)] out PendingOffer offer);

    /// <summary>
    /// Removes and returns every offer the client sent or received.
    /// </summary>
    IReadOnlyList<PendingOffer> RemoveAllOf(string clientToken);
}
