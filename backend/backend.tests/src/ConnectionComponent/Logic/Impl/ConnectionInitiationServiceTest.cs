using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Dataaccess.Impl;
using backend.ConnectionComponent.Logic.Impl;
using backend.SignalingComponent.Common.Api.DTOs;
using backend.SignalingComponent.Logic.Api;
using backend.TelemetryComponent.Logic.Api;
using backend.tests.TestUtils;
using backend.WebSocketComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Logic.Api;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.tests.ConnectionComponent.Logic.Impl;

[Category("UnitTest")]
public class ConnectionInitiationServiceTest
{
    private const string TOKEN_A = "sabak";
    private const string TOKEN_B = "rinot";

    private Mock<IWebSocketHandler> _mockHandler;
    private Mock<IUsageMetrics> _mockUsageMetrics;
    private SentMessages _sent;
    private PairRepository _pairRepository;
    private ConnectionInitiationService _service;

    [SetUp]
    public void Setup()
    {
        _mockHandler = new Mock<IWebSocketHandler>();
        _sent = new SentMessages().Capture<EstablishConnectionMessage>(_mockHandler);
        _mockUsageMetrics = new Mock<IUsageMetrics>();
        _pairRepository = new PairRepository();

        var iceServerProvider = new Mock<IIceServerProvider>();
        iceServerProvider
            .Setup(p => p.CreateIceServers(It.IsAny<string>()))
            .Returns<string>(token => [new IceServer { Urls = [$"turn:{token}"] }]);

        _service = new ConnectionInitiationService(
            _mockHandler.Object,
            _pairRepository,
            iceServerProvider.Object,
            _mockUsageMetrics.Object,
            NullLogger<ConnectionInitiationService>.Instance);
    }

    [Test]
    public async Task InitiateConnection_SendsEachPeerItsPartnerAndOwnIceServers()
    {
        var initiated = await _service.InitiateConnection(TOKEN_A, TOKEN_B, "offer");

        var toA = _sent.To<EstablishConnectionMessage>(TOKEN_A).Single();
        var toB = _sent.To<EstablishConnectionMessage>(TOKEN_B).Single();
        Assert.Multiple(() =>
        {
            Assert.That(initiated, Is.True);
            Assert.That(toA.RemoteToken, Is.EqualTo(TOKEN_B));
            Assert.That(toA.IceServers.Single().Urls, Is.EqualTo(new[] { $"turn:{TOKEN_A}" }));
            Assert.That(toB.RemoteToken, Is.EqualTo(TOKEN_A));
            Assert.That(toB.IceServers.Single().Urls, Is.EqualTo(new[] { $"turn:{TOKEN_B}" }));
            Assert.That(_pairRepository.AreConnected(TOKEN_A, TOKEN_B), Is.True);
        });
        _mockUsageMetrics.Verify(m => m.ConnectionInitiated("offer"), Times.Once);
    }

    [TestCase(true)]
    [TestCase(false)]
    public async Task InitiateConnection_ReportsWhetherBothShareAnAccount(bool sameAccount)
    {
        _mockHandler.Setup(h => h.AreSignedInWithSameAccount(TOKEN_A, TOKEN_B)).Returns(sameAccount);

        await _service.InitiateConnection(TOKEN_A, TOKEN_B, "own_device");

        Assert.Multiple(() =>
        {
            Assert.That(_sent.To<EstablishConnectionMessage>(TOKEN_A).Single().OwnDevice, Is.EqualTo(sameAccount));
            Assert.That(_sent.To<EstablishConnectionMessage>(TOKEN_B).Single().OwnDevice, Is.EqualTo(sameAccount));
        });
    }

    [Test]
    public async Task InitiateConnection_PairAlreadyConnected_SendsNothing()
    {
        await _service.InitiateConnection(TOKEN_A, TOKEN_B, "offer");

        var initiated = await _service.InitiateConnection(TOKEN_B, TOKEN_A, "reconnect");

        Assert.Multiple(() =>
        {
            Assert.That(initiated, Is.False);
            Assert.That(_sent.Count, Is.EqualTo(2));
        });
        _mockUsageMetrics.Verify(m => m.ConnectionInitiated("reconnect"), Times.Never);
    }

    [Test]
    public void EstablishConnectionMessage_SerializesOwnDevice()
    {
        var json = ((ITypedMessage)new EstablishConnectionMessage
        {
            RemoteToken = TOKEN_B,
            IceServers = [],
            OwnDevice = true,
        }).ToJson();

        Assert.That(json, Is.EqualTo("""{"type":"establish-connection","msg":{"remoteToken":"rinot","iceServers":[],"ownDevice":true}}"""));
    }
}
