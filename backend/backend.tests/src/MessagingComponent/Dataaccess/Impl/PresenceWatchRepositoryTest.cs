using backend.MessagingComponent.Dataaccess.Impl;

namespace backend.tests.MessagingComponent.Dataaccess.Impl;

[Category("UnitTest")]
public class PresenceWatchRepositoryTest
{
    private const string WATCHER = "sabak";
    private const string WATCHED = "rinot";
    private const string OTHER = "lukid";

    private PresenceWatchRepository _repository;

    [SetUp]
    public void Setup()
    {
        _repository = new PresenceWatchRepository();
    }

    [Test]
    public void RemoveClient_WatchedClient_ReturnsLowercaseWatchers()
    {
        _repository.Watch(WATCHER.ToUpperInvariant(), WATCHED);
        _repository.Watch(OTHER, WATCHED.ToUpperInvariant());

        Assert.That(_repository.RemoveClient(WATCHED), Is.EquivalentTo(new[] { WATCHER, OTHER }));
    }

    [Test]
    public void Watch_SecondToken_ReplacesFirst()
    {
        _repository.Watch(WATCHER, WATCHED);
        _repository.Watch(WATCHER, OTHER);

        Assert.Multiple(() =>
        {
            Assert.That(_repository.RemoveClient(WATCHED), Is.Empty);
            Assert.That(_repository.RemoveClient(OTHER), Is.EqualTo(new[] { WATCHER }));
        });
    }

    [Test]
    public void RemoveClient_Watcher_DropsItsWatch()
    {
        _repository.Watch(WATCHER, WATCHED);

        _repository.RemoveClient(WATCHER);

        Assert.That(_repository.RemoveClient(WATCHED), Is.Empty);
    }
}
