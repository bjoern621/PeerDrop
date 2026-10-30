using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Dataaccess.Impl;
using backend.ConnectionComponent.Logic.Api;
using backend.ConnectionComponent.Logic.Impl;
using backend.tests.TestUtils;
using backend.TokenComponent.Logic.Api;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.tests.ConnectionComponent.Logic.Impl;

[Category("UnitTest")]
public class PeerConnectionServiceTest
{
    private const string TOKEN_A = "sabak";
    private const string TOKEN_B = "rinot";
    private const string TOKEN_C = "lukid";
    private const string OFFLINE = "dofug";

    private Mock<IClientRegistry> _mockHandler;
    private Mock<IConnectionInitiationService> _mockConnectionInitiationService;
    private SentMessages _sent;
    private PairRepository _pairRepository;
    private PeerConnectionService _service;

    [SetUp]
    public void Setup()
    {
        _mockHandler = new Mock<IClientRegistry>();
        _mockHandler.Setup(h => h.RemoteTokenExists(It.IsAny<string>())).Returns<string>(t => t != OFFLINE);
        _sent = new SentMessages()
            .Capture<CloseConnectionMessage>(_mockHandler)
            .Capture<ResumeConnectionMessage>(_mockHandler);
        _mockConnectionInitiationService = new Mock<IConnectionInitiationService>();
        _pairRepository = new PairRepository();

        _service = new PeerConnectionService(
            _mockHandler.Object,
            _pairRepository,
            _mockConnectionInitiationService.Object,
            NullLogger<PeerConnectionService>.Instance);
    }

    private void VerifyNoInitiation() =>
        _mockConnectionInitiationService.Verify(
            s => s.InitiateConnection(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);

    [Test]
    public async Task HandlePeerConnect_WithoutPermission_IsIgnored()
    {
        await _service.HandlePeerConnect(TOKEN_A, new PeerConnectMessage { To = TOKEN_B });

        VerifyNoInitiation();
    }

    [TestCase(TOKEN_A, TOKEN_B)]
    [TestCase(TOKEN_B, TOKEN_A)]
    public async Task HandlePeerConnect_PermissionInEitherDirection_InitiatesReconnect(string sender, string receiver)
    {
        _pairRepository.AddPermission(sender, receiver);

        await _service.HandlePeerConnect(TOKEN_A, new PeerConnectMessage { To = TOKEN_B.ToUpperInvariant() });

        _mockConnectionInitiationService.Verify(s => s.InitiateConnection(TOKEN_A, TOKEN_B, "reconnect"), Times.Once);
    }

    [Test]
    public async Task HandlePeerConnect_SameAccount_RecordsBothPermissionsAndInitiatesOwnDevice()
    {
        _mockHandler.Setup(h => h.AreSignedInWithSameAccount(TOKEN_A, TOKEN_B)).Returns(true);

        await _service.HandlePeerConnect(TOKEN_A, new PeerConnectMessage { To = TOKEN_B });

        _mockConnectionInitiationService.Verify(s => s.InitiateConnection(TOKEN_A, TOKEN_B, "own_device"), Times.Once);
        Assert.That(_pairRepository.HasPermissionEitherWay(TOKEN_B, TOKEN_A), Is.True);
    }

    [Test]
    public async Task HandlePeerConnect_TargetOffline_IsIgnored()
    {
        _pairRepository.AddPermission(TOKEN_A, OFFLINE);

        await _service.HandlePeerConnect(TOKEN_A, new PeerConnectMessage { To = OFFLINE });

        VerifyNoInitiation();
    }

    [Test]
    public async Task HandlePeerConnect_ToItself_IsIgnored()
    {
        _mockHandler.Setup(h => h.AreSignedInWithSameAccount(TOKEN_A, TOKEN_A)).Returns(true);

        await _service.HandlePeerConnect(TOKEN_A, new PeerConnectMessage { To = TOKEN_A });

        VerifyNoInitiation();
    }

    [Test]
    public async Task HandleCloseConnection_ConnectedPair_ForwardsCloseAndKeepsPermission()
    {
        _pairRepository.AddPermission(TOKEN_A, TOKEN_B);
        _pairRepository.TryAddConnectedPair(TOKEN_A, TOKEN_B);

        await _service.HandleCloseConnection(TOKEN_A, new CloseConnectionMessage { RemoteToken = TOKEN_B });

        Assert.Multiple(() =>
        {
            Assert.That(_sent.To<CloseConnectionMessage>(TOKEN_B).Single().RemoteToken, Is.EqualTo(TOKEN_A));
            Assert.That(_sent.To<CloseConnectionMessage>(TOKEN_B).Single().Gone, Is.False);
            Assert.That(_pairRepository.AreConnected(TOKEN_A, TOKEN_B), Is.False);
            Assert.That(_pairRepository.HasPermissionEitherWay(TOKEN_A, TOKEN_B), Is.True);
        });
    }

    [Test]
    public async Task HandleCloseConnection_NotConnected_SendsNothing()
    {
        await _service.HandleCloseConnection(TOKEN_A, new CloseConnectionMessage { RemoteToken = TOKEN_B });

        Assert.That(_sent.Count, Is.Zero);
    }

    [Test]
    public async Task HandleClientDisconnected_ClosesConnectionAtEveryPartnerAsGoneAndDropsPermissions()
    {
        _pairRepository.AddPermission(TOKEN_A, TOKEN_B);
        _pairRepository.TryAddConnectedPair(TOKEN_A, TOKEN_B);
        _pairRepository.TryAddConnectedPair(TOKEN_C, TOKEN_A);

        await _service.HandleClientDisconnected(TOKEN_A);

        Assert.Multiple(() =>
        {
            Assert.That(_sent.To<CloseConnectionMessage>(TOKEN_B).Single().RemoteToken, Is.EqualTo(TOKEN_A));
            Assert.That(_sent.To<CloseConnectionMessage>(TOKEN_C).Single().RemoteToken, Is.EqualTo(TOKEN_A));
            Assert.That(_sent.To<CloseConnectionMessage>(TOKEN_B).Single().Gone, Is.True);
            Assert.That(_pairRepository.HasPermissionEitherWay(TOKEN_A, TOKEN_B), Is.False);
        });
    }

    [Test]
    public async Task HandleResumeConnection_FirstClaim_ForwardsItAndLeavesPairDisconnected()
    {
        await _service.HandleResumeConnection(TOKEN_A, new ResumeConnectionMessage { RemoteToken = TOKEN_B.ToUpperInvariant() });

        Assert.Multiple(() =>
        {
            Assert.That(_sent.To<ResumeConnectionMessage>(TOKEN_B).Single().RemoteToken, Is.EqualTo(TOKEN_A));
            Assert.That(_pairRepository.AreConnected(TOKEN_A, TOKEN_B), Is.False);
        });
    }

    [Test]
    public async Task HandleResumeConnection_BothClaimed_ConnectsPairAndForwardsSecondClaim()
    {
        await _service.HandleResumeConnection(TOKEN_A, new ResumeConnectionMessage { RemoteToken = TOKEN_B });
        await _service.HandleResumeConnection(TOKEN_B, new ResumeConnectionMessage { RemoteToken = TOKEN_A });

        Assert.Multiple(() =>
        {
            Assert.That(_pairRepository.AreConnected(TOKEN_A, TOKEN_B), Is.True);
            Assert.That(_sent.To<ResumeConnectionMessage>(TOKEN_A).Single().RemoteToken, Is.EqualTo(TOKEN_B));
            Assert.That(_pairRepository.HasPermissionEitherWay(TOKEN_A, TOKEN_B), Is.False);
        });
    }

    [Test]
    public async Task HandleResumeConnection_RepeatedClaim_ForwardsOnce()
    {
        await _service.HandleResumeConnection(TOKEN_A, new ResumeConnectionMessage { RemoteToken = TOKEN_B });
        await _service.HandleResumeConnection(TOKEN_A, new ResumeConnectionMessage { RemoteToken = TOKEN_B });

        Assert.That(_sent.To<ResumeConnectionMessage>(TOKEN_B), Has.Count.EqualTo(1));
    }

    [TestCase(OFFLINE)]
    [TestCase(TOKEN_A)]
    public async Task HandleResumeConnection_PartnerOfflineOrItself_IsIgnored(string partner)
    {
        await _service.HandleResumeConnection(TOKEN_A, new ResumeConnectionMessage { RemoteToken = partner });

        Assert.That(_sent.Count, Is.Zero);
    }

    [Test]
    public async Task HandleResumeConnection_ConnectedPair_IsIgnored()
    {
        _pairRepository.TryAddConnectedPair(TOKEN_A, TOKEN_B);

        await _service.HandleResumeConnection(TOKEN_A, new ResumeConnectionMessage { RemoteToken = TOKEN_B });

        Assert.That(_sent.Count, Is.Zero);
    }

    [Test]
    public async Task HandleResumeConnection_ClaimOfDisconnectedClient_IsForgotten()
    {
        await _service.HandleResumeConnection(TOKEN_A, new ResumeConnectionMessage { RemoteToken = TOKEN_B });
        await _service.HandleClientDisconnected(TOKEN_A);

        await _service.HandleResumeConnection(TOKEN_B, new ResumeConnectionMessage { RemoteToken = TOKEN_A });

        Assert.That(_pairRepository.AreConnected(TOKEN_A, TOKEN_B), Is.False);
    }
}
