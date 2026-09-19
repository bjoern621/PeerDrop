using backend.LanComponent.Common.Api.DTOs;
using backend.LanComponent.Logic.Api;
using backend.LanComponent.Logic.Impl;
using backend.WebSocketComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Logic.Api;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.tests.LanComponent.Logic.Impl;

[Category("UnitTest")]
public class LanDiscoveryServiceTest
{
    private const string NETWORK_IP = "203.0.113.7";
    private const string TOKEN_A = "ABCDE";
    private const string TOKEN_B = "BCDEF";

    // ITypedMessage carries a static abstract member, so it cannot stand as a
    // generic argument of Moq's Callback overloads.
    private delegate void SendMessageCallback(string recipientToken, ITypedMessage message);

    private Mock<IWebSocketHandler> _mockHandler;
    private ILanDiscoveryService _service;

    // Peer lists the mock handler captured, newest last, per recipient.
    private Dictionary<string, List<LanPeersMessage>> _sentPeerLists;

    [SetUp]
    public void Setup()
    {
        _mockHandler = new Mock<IWebSocketHandler>();
        _sentPeerLists = [];

        _mockHandler
            .Setup(handler => handler.SendMessage(It.IsAny<string>(), It.IsAny<LanPeersMessage>()))
            .Callback(new SendMessageCallback((recipientToken, message) =>
            {
                if (!_sentPeerLists.TryGetValue(recipientToken, out var messages))
                {
                    messages = [];
                    _sentPeerLists[recipientToken] = messages;
                }

                messages.Add((LanPeersMessage)message);
            }))
            .ReturnsAsync(true);

        _service = new LanDiscoveryService(_mockHandler.Object, NullLogger<LanDiscoveryService>.Instance);
    }

    private Task Connect(string clientToken) =>
        _service.HandleClientConnected(new ClientConnectedEvent
        {
            ClientToken = clientToken,
            RemoteIpAddress = NETWORK_IP,
        });

    private Task ReportDiscovery(string clientToken, bool enabled) =>
        _service.HandleLanDiscoveryState(clientToken, new LanDiscoveryStateMessage { Enabled = enabled });

    private async Task ConnectAndReportDiscovery(string clientToken, bool enabled)
    {
        await Connect(clientToken);
        await ReportDiscovery(clientToken, enabled);
    }

    private List<string> LastPeerTokensFor(string clientToken) =>
        [.. _sentPeerLists[clientToken][^1].Peers.Select(peer => peer.Token)];

    private int PeerListCountFor(string clientToken) =>
        _sentPeerLists.TryGetValue(clientToken, out var messages) ? messages.Count : 0;

    [Test]
    public async Task HandleLanPeersRequest_DiscoveryDisabled_SendsEmptyList()
    {
        await ConnectAndReportDiscovery(TOKEN_A, false);
        await ConnectAndReportDiscovery(TOKEN_B, true);

        await _service.HandleLanPeersRequest(TOKEN_A, new RequestLanPeersMessage());

        Assert.That(LastPeerTokensFor(TOKEN_A), Is.Empty);
    }

    [Test]
    public async Task HandleLanPeersRequest_PeerHasNotReportedDiscovery_LeavesPeerOut()
    {
        await ConnectAndReportDiscovery(TOKEN_A, true);
        await Connect(TOKEN_B);

        await _service.HandleLanPeersRequest(TOKEN_A, new RequestLanPeersMessage());

        Assert.That(LastPeerTokensFor(TOKEN_A), Is.Empty);
    }

    [Test]
    public async Task HandleClientConnected_BeforeThatClientReportsDiscovery_PushesNothing()
    {
        await ConnectAndReportDiscovery(TOKEN_A, true);
        var pushesBefore = PeerListCountFor(TOKEN_A);

        await Connect(TOKEN_B);

        Assert.That(PeerListCountFor(TOKEN_A), Is.EqualTo(pushesBefore));
    }

    [Test]
    public async Task HandleLanDiscoveryState_Disabled_RemovesClientFromOtherPeerLists()
    {
        await ConnectAndReportDiscovery(TOKEN_A, true);
        await ConnectAndReportDiscovery(TOKEN_B, true);

        Assert.That(LastPeerTokensFor(TOKEN_B), Does.Contain(TOKEN_A));

        await ReportDiscovery(TOKEN_A, false);

        Assert.That(LastPeerTokensFor(TOKEN_B), Is.Empty);
    }

    [Test]
    public async Task HandleLanDiscoveryState_Disabled_ClearsOwnPeerList()
    {
        await ConnectAndReportDiscovery(TOKEN_A, true);
        await ConnectAndReportDiscovery(TOKEN_B, true);

        await ReportDiscovery(TOKEN_A, false);

        Assert.That(LastPeerTokensFor(TOKEN_A), Is.Empty);
    }

    [Test]
    public async Task HandleLanDiscoveryState_Reenabled_RestoresBothPeerLists()
    {
        await ConnectAndReportDiscovery(TOKEN_A, true);
        await ConnectAndReportDiscovery(TOKEN_B, true);
        await ReportDiscovery(TOKEN_A, false);

        await ReportDiscovery(TOKEN_A, true);

        Assert.Multiple(() =>
        {
            Assert.That(LastPeerTokensFor(TOKEN_A), Does.Contain(TOKEN_B));
            Assert.That(LastPeerTokensFor(TOKEN_B), Does.Contain(TOKEN_A));
        });
    }
}
