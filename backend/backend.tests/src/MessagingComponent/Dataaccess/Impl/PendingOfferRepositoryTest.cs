using backend.MessagingComponent.Dataaccess.Api;
using backend.MessagingComponent.Dataaccess.Impl;

namespace backend.tests.MessagingComponent.Dataaccess.Impl;

[Category("UnitTest")]
public class PendingOfferRepositoryTest
{
    private const string SENDER = "sabak";
    private const string RECEIVER = "rinot";
    private const string OTHER = "lukid";

    private PendingOfferRepository _repository;

    [SetUp]
    public void Setup()
    {
        _repository = new PendingOfferRepository();
    }

    [Test]
    public void TryAdd_OfferIdPendingForSender_ReturnsFalse()
    {
        _repository.TryAdd(new PendingOffer("o1", SENDER, RECEIVER));

        Assert.That(_repository.TryAdd(new PendingOffer("o1", SENDER, OTHER)), Is.False);
    }

    [Test]
    public void TryAdd_OfferIdPendingForReceiver_ReturnsFalse()
    {
        _repository.TryAdd(new PendingOffer("o1", SENDER, RECEIVER));

        Assert.That(_repository.TryAdd(new PendingOffer("o1", OTHER, RECEIVER)), Is.False);
    }

    [Test]
    public void TryRemoveByReceiver_OtherClient_FindsNothing()
    {
        _repository.TryAdd(new PendingOffer("o1", SENDER, RECEIVER));

        Assert.Multiple(() =>
        {
            Assert.That(_repository.TryRemoveByReceiver(OTHER, "o1", out _), Is.False);
            Assert.That(_repository.TryRemoveByReceiver(SENDER, "o1", out _), Is.False);
            Assert.That(_repository.TryRemoveByReceiver(RECEIVER.ToUpperInvariant(), "o1", out var offer), Is.True);
            Assert.That(offer, Is.EqualTo(new PendingOffer("o1", SENDER, RECEIVER)));
        });
    }

    [Test]
    public void RemoveAllOf_RemovesSentAndReceivedOffers()
    {
        _repository.TryAdd(new PendingOffer("o1", SENDER, RECEIVER));
        _repository.TryAdd(new PendingOffer("o2", OTHER, SENDER));
        _repository.TryAdd(new PendingOffer("o3", OTHER, RECEIVER));

        var removed = _repository.RemoveAllOf(SENDER);

        Assert.Multiple(() =>
        {
            Assert.That(removed.Select(o => o.OfferId), Is.EquivalentTo(new[] { "o1", "o2" }));
            Assert.That(_repository.TryRemoveBySender(OTHER, "o3", out _), Is.True);
        });
    }
}
