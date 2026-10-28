using System.Text.Json;
using backend.TokenComponent.Common.Api.DTOs;
using backend.TokenComponent.Logic.Impl;
using backend.WebSocketComponent.Common.Api;
using backend.WebSocketComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Logic.Api;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;

namespace backend.tests.TokenComponent.Logic.Impl;

[Category("UnitTest")]
public class ClientRegistryTest
{
    private const string GeneratedTokenPattern = "^[bdfghjklmnprstvz][aiou][bdfghjklmnprstvz][aiou][bdfghjklmnprstvz]$";

    /// <summary>
    /// Keeps what the registry sends and closes.
    /// </summary>
    private class FakeTransport : IWebSocketTransport
    {
        // ITypedMessage carries a static abstract member, so it cannot stand as a type argument.
        public readonly List<(Guid ConnectionId, object Message)> Sent = [];
        public readonly List<Guid> Closed = [];

        public event Func<Guid, ClientConnectionInfo, Task>? ConnectionOpened { add { } remove { } }
        public event Func<Guid, string, JsonElement, Task>? MessageReceived { add { } remove { } }
        public event Func<Guid, Task>? ConnectionClosed { add { } remove { } }

        public Task HandleConnect(Microsoft.AspNetCore.Http.HttpContext context) => throw new NotSupportedException();

        public Task<bool> SendMessage(Guid connectionId, ITypedMessage message)
        {
            Sent.Add((connectionId, (object)message));
            return Task.FromResult(true);
        }

        public void Close(Guid connectionId) => Closed.Add(connectionId);
    }

    private record Note(string Text);

    private FakeTransport _transport;
    private FakeTimeProvider _clock;
    private ClientRegistry _registry;
    private List<string> _events;

    [SetUp]
    public void Setup()
    {
        _transport = new FakeTransport();
        _clock = new FakeTimeProvider();
        _registry = new ClientRegistry(_transport, _clock, NullLogger<ClientRegistry>.Instance);
        _events = [];
        _registry.ClientConnected += connected =>
        {
            _events.Add($"connected {connected.ClientToken}");
            return Task.CompletedTask;
        };
        _registry.ClientDisconnected += token =>
        {
            _events.Add($"disconnected {token}");
            return Task.CompletedTask;
        };
    }

    private async Task<Guid> Open()
    {
        var connectionId = Guid.NewGuid();
        await _registry.HandleConnectionOpened(connectionId, new ClientConnectionInfo(null, "203.0.113.7", null));
        return connectionId;
    }

    private async Task<(Guid ConnectionId, ClientTokenMessage Token)> Connect(string? requestedToken = null, string? reclaimKey = null)
    {
        var connectionId = await Open();
        var hello = new HelloMessage { RequestedToken = requestedToken, ReclaimKey = reclaimKey };
        await _registry.HandleMessage(connectionId, HelloMessage.TypeString, JsonSerializer.SerializeToElement(hello));

        var token = _transport.Sent
            .Where(sent => sent.ConnectionId == connectionId)
            .Select(sent => sent.Message)
            .OfType<ClientTokenMessage>()
            .Single();
        return (connectionId, token);
    }

    [Test]
    public async Task Hello_FreeRequestedToken_AssignsIt()
    {
        var (_, token) = await Connect("ab12c");

        Assert.Multiple(() =>
        {
            Assert.That(token.ClientToken, Is.EqualTo("ab12c"));
            Assert.That(_events, Is.EqualTo(new[] { "connected ab12c" }));
        });
    }

    [Test]
    public async Task Hello_UppercaseRequestedToken_AssignsLowercase()
    {
        var (_, token) = await Connect("AB12C");

        Assert.That(token.ClientToken, Is.EqualTo("ab12c"));
    }

    [TestCase(null)]
    [TestCase("abcd")]
    [TestCase("abcdef")]
    [TestCase("ab-cd")]
    public async Task Hello_NoValidRequest_AssignsGeneratedToken(string? requestedToken)
    {
        var (_, token) = await Connect(requestedToken);

        Assert.That(token.ClientToken, Does.Match(GeneratedTokenPattern));
    }

    [Test]
    public async Task Hello_RequestedTokenHeld_AssignsGeneratedTokenAndKeepsHolder()
    {
        var (holderId, _) = await Connect("ab12c");

        var (_, token) = await Connect("ab12c");

        Assert.Multiple(() =>
        {
            Assert.That(token.ClientToken, Does.Match(GeneratedTokenPattern));
            Assert.That(_transport.Closed, Does.Not.Contain(holderId));
        });
    }

    [Test]
    public async Task Hello_HoldersReclaimKey_TakesTokenOverAndClosesHolder()
    {
        var (holderId, held) = await Connect("ab12c");

        var (_, token) = await Connect("ab12c", held.ReclaimKey);

        Assert.Multiple(() =>
        {
            Assert.That(token.ClientToken, Is.EqualTo("ab12c"));
            Assert.That(token.ReclaimKey, Is.Not.EqualTo(held.ReclaimKey));
            Assert.That(_transport.Closed, Is.EqualTo(new[] { holderId }));
            Assert.That(_events, Is.EqualTo(new[] { "connected ab12c", "disconnected ab12c", "connected ab12c" }));
        });
    }

    [Test]
    public async Task Hello_GeneratedTokenWithItsReclaimKey_TakesTokenOver()
    {
        var (_, held) = await Connect();

        var (_, token) = await Connect(held.ClientToken, held.ReclaimKey);

        Assert.That(token.ClientToken, Is.EqualTo(held.ClientToken));
    }

    [Test]
    public async Task Hello_ReclaimKeyOfAnEarlierHolder_AssignsGeneratedToken()
    {
        var (_, first) = await Connect("ab12c");
        await Connect("ab12c", first.ReclaimKey);

        var (_, token) = await Connect("ab12c", first.ReclaimKey);

        Assert.That(token.ClientToken, Does.Match(GeneratedTokenPattern));
    }

    [Test]
    public async Task Hello_WrongReclaimKey_AssignsGeneratedToken()
    {
        await Connect("ab12c");

        var (_, token) = await Connect("ab12c", "AAAAAAAAAAAAAAAAAAAAAA==");

        Assert.That(token.ClientToken, Does.Match(GeneratedTokenPattern));
    }

    [Test]
    public async Task HandleMessage_FirstMessageNotHello_ClosesConnection()
    {
        var connectionId = await Open();

        await _registry.HandleMessage(connectionId, "text", JsonSerializer.SerializeToElement(new Note("hi")));

        Assert.Multiple(() =>
        {
            Assert.That(_transport.Closed, Is.EqualTo(new[] { connectionId }));
            Assert.That(_transport.Sent, Is.Empty);
        });
    }

    [Test]
    public async Task HandleConnectionOpened_NoHelloInTime_ClosesConnection()
    {
        var connectionId = await Open();

        _clock.Advance(ClientRegistry.HelloTimeout);

        Assert.That(() => _transport.Closed, Does.Contain(connectionId).After(1000, 10));
    }

    [Test]
    public async Task HandleConnectionOpened_HelloInTime_KeepsConnection()
    {
        var (connectionId, _) = await Connect();

        _clock.Advance(ClientRegistry.HelloTimeout);
        await Task.Delay(50);

        Assert.That(_transport.Closed, Does.Not.Contain(connectionId));
    }

    [Test]
    public async Task HandleMessage_AfterHello_ReachesSubscribersWithSenderToken()
    {
        var received = new List<(string Token, string Text)>();
        _registry.SubscribeToMessageType<Note>("note", (token, note) =>
        {
            received.Add((token, note.Text));
            return Task.CompletedTask;
        });
        var (connectionId, token) = await Connect("ab12c");

        await _registry.HandleMessage(connectionId, "note", JsonSerializer.SerializeToElement(new Note("hi")));

        Assert.That(received, Is.EqualTo(new[] { (token.ClientToken, "hi") }));
    }

    [Test]
    public async Task HandleConnectionClosed_FreesToken()
    {
        var (connectionId, _) = await Connect("ab12c");

        await _registry.HandleConnectionClosed(connectionId);
        var (_, token) = await Connect("ab12c");

        Assert.Multiple(() =>
        {
            Assert.That(token.ClientToken, Is.EqualTo("ab12c"));
            Assert.That(_events, Is.EqualTo(new[] { "connected ab12c", "disconnected ab12c", "connected ab12c" }));
        });
    }

    [Test]
    public async Task HandleConnectionClosed_ReclaimedConnection_KeepsTokenWithItsNewConnection()
    {
        var (holderId, held) = await Connect("ab12c");
        var (newId, _) = await Connect("ab12c", held.ReclaimKey);

        await _registry.HandleConnectionClosed(holderId);
        await _registry.SendMessage("AB12C", new PongMessage());

        Assert.Multiple(() =>
        {
            Assert.That(_registry.RemoteTokenExists("ab12c"), Is.True);
            Assert.That(_events, Has.Count.EqualTo(3));
            Assert.That(_transport.Sent[^1].ConnectionId, Is.EqualTo(newId));
        });
    }
}
