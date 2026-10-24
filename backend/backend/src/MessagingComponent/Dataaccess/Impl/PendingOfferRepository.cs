using System.Diagnostics.CodeAnalysis;
using backend.MessagingComponent.Dataaccess.Api;

namespace backend.MessagingComponent.Dataaccess.Impl;

public class PendingOfferRepository : IPendingOfferRepository
{
    private readonly List<PendingOffer> _offers = [];
    private readonly Lock _lock = new();

    public bool TryAdd(PendingOffer offer)
    {
        var normalized = offer with
        {
            SenderToken = Normalize(offer.SenderToken),
            ReceiverToken = Normalize(offer.ReceiverToken),
        };

        lock (_lock)
        {
            // Unique per receiver as well, since the receiver answers by offer ID alone.
            if (_offers.Any(o => o.OfferId == offer.OfferId
                && (o.SenderToken == normalized.SenderToken || o.ReceiverToken == normalized.ReceiverToken)))
                return false;

            _offers.Add(normalized);
            return true;
        }
    }

    public bool TryRemoveBySender(string senderToken, string offerId, [MaybeNullWhen(false)] out PendingOffer offer)
    {
        var token = Normalize(senderToken);
        return TryRemove(o => o.SenderToken == token && o.OfferId == offerId, out offer);
    }

    public bool TryRemoveByReceiver(string receiverToken, string offerId, [MaybeNullWhen(false)] out PendingOffer offer)
    {
        var token = Normalize(receiverToken);
        return TryRemove(o => o.ReceiverToken == token && o.OfferId == offerId, out offer);
    }

    public IReadOnlyList<PendingOffer> RemoveAllOf(string clientToken)
    {
        var token = Normalize(clientToken);

        lock (_lock)
        {
            var removed = _offers.Where(o => o.SenderToken == token || o.ReceiverToken == token).ToList();
            _offers.RemoveAll(o => o.SenderToken == token || o.ReceiverToken == token);
            return removed;
        }
    }

    private bool TryRemove(Predicate<PendingOffer> match, [MaybeNullWhen(false)] out PendingOffer offer)
    {
        lock (_lock)
        {
            var index = _offers.FindIndex(match);
            if (index < 0)
            {
                offer = null;
                return false;
            }

            offer = _offers[index];
            _offers.RemoveAt(index);
            return true;
        }
    }

    private static string Normalize(string clientToken) => clientToken.ToLowerInvariant();
}
