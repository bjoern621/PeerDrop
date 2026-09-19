using System.Net;
using backend.CommonComponent;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace backend.tests.CommonComponent;

[Category("UnitTest")]
public class TrustedProxiesTest
{
    private const string PROXY = "172.18.0.2";
    private const string CLIENT = "203.0.113.7";

    /// <summary>
    /// Runs the forwarded headers middleware over a connection from <paramref name="connectionAddress"/>
    /// carrying <paramref name="forwardedFor"/>, and returns the address the pipeline sees afterwards.
    /// </summary>
    private static async Task<string?> RemoteAddressSeenBehind(string? trustedProxies, string connectionAddress, string forwardedFor)
    {
        var options = new ForwardedHeadersOptions();
        TrustedProxies.Configure(options, trustedProxies);

        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse(connectionAddress);
        context.Request.Headers["X-Forwarded-For"] = forwardedFor;

        var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, Options.Create(options));
        await middleware.Invoke(context);

        return context.Connection.RemoteIpAddress?.ToString();
    }

    [Test]
    public async Task Configure_ProxyListedByAddress_ReplacesConnectionAddressWithForwardedOne()
    {
        var seen = await RemoteAddressSeenBehind(PROXY, PROXY, CLIENT);

        Assert.That(seen, Is.EqualTo(CLIENT));
    }

    [Test]
    public async Task Configure_ProxyInsideListedNetwork_ReplacesConnectionAddressWithForwardedOne()
    {
        var seen = await RemoteAddressSeenBehind("172.18.0.0/16", PROXY, CLIENT);

        Assert.That(seen, Is.EqualTo(CLIENT));
    }

    [Test]
    public async Task Configure_SeveralEntries_TrustsEachOfThem()
    {
        var seen = await RemoteAddressSeenBehind("10.0.0.5, 172.18.0.0/16", PROXY, CLIENT);

        Assert.That(seen, Is.EqualTo(CLIENT));
    }

    [Test]
    public async Task Configure_SenderNotListed_KeepsConnectionAddress()
    {
        var seen = await RemoteAddressSeenBehind("10.0.0.5", PROXY, CLIENT);

        Assert.That(seen, Is.EqualTo(PROXY));
    }

    [Test]
    public async Task Configure_NoProxies_KeepsConnectionAddress()
    {
        var seen = await RemoteAddressSeenBehind(null, PROXY, CLIENT);

        Assert.That(seen, Is.EqualTo(PROXY));
    }

    [Test]
    public async Task Configure_HeaderWithSeveralHops_TakesTheOneAddedByTheProxy()
    {
        // A client sets the header itself and the proxy appends the real address.
        var seen = await RemoteAddressSeenBehind(PROXY, PROXY, $"198.51.100.9, {CLIENT}");

        Assert.That(seen, Is.EqualTo(CLIENT));
    }

    [Test]
    public void Configure_EntryNeitherAddressNorNetwork_Throws()
    {
        Assert.That(
            () => TrustedProxies.Configure(new ForwardedHeadersOptions(), "proxy.internal"),
            Throws.TypeOf<ApplicationException>());
    }
}
