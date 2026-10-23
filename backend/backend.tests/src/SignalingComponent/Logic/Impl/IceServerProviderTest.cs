using backend.SignalingComponent.Logic.Impl;
using Moq;

namespace backend.tests.SignalingComponent.Logic.Impl;

[Category("UnitTest")]
public class IceServerProviderTest
{
    private static TimeProvider FixedTime(long unixSeconds)
    {
        var timeProvider = new Mock<TimeProvider>();
        timeProvider.Setup(t => t.GetUtcNow()).Returns(DateTimeOffset.FromUnixTimeSeconds(unixSeconds));
        return timeProvider.Object;
    }

    [Test]
    public void CreateIceServers_WithoutTurnHost_ReturnsNoServers()
    {
        var provider = new IceServerProvider(null, null, FixedTime(1_700_000_000));

        Assert.That(provider.CreateIceServers("abcde"), Is.Empty);
    }

    [Test]
    public void CreateIceServers_SignsExpiringUsernameWithSharedSecret()
    {
        var provider = new IceServerProvider("turn.example.org", "test-secret", FixedTime(1_700_000_000));

        var turn = provider.CreateIceServers("abcde").Single(s => s.Username != null);

        Assert.That(turn.Username, Is.EqualTo("1700086400:abcde"));
        // printf '%s' '1700086400:abcde' | openssl dgst -sha1 -hmac test-secret -binary | base64
        Assert.That(turn.Credential, Is.EqualTo("k5aVOO7JCRJyu4rupF8FKGy/lN4="));
    }

    [Test]
    public void CreateIceServers_OffersTlsOn443()
    {
        var provider = new IceServerProvider("turn.example.org", "test-secret", FixedTime(1_700_000_000));

        var urls = provider.CreateIceServers("abcde").SelectMany(s => s.Urls);

        Assert.That(urls, Does.Contain("turns:turn.example.org:443?transport=tcp"));
    }
}
