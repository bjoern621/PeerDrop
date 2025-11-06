using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Dataaccess.Api;
using backend.ConnectionComponent.Logic.Api;
using backend.ConnectionComponent.Logic.Impl;
using backend.DeviceComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.tests.ConnectionComponent.Logic.Impl;

public class TokenConnectServiceTest
{
    private Mock<IWebSocketHandler> _mockHandler;
    private Mock<IServiceScopeFactory> _mockScopeFactory;
    private Mock<IDeviceService> _mockDeviceService;
    private Mock<IOpenConnectionRequestRepository> _mockOpenConnectionRequestRepository;
    private Mock<IConnectionInitiationService> _mockConnectionInitiationService;
    private ITokenConnectService _service;

    [SetUp]
    public void Setup()
    {
        _mockHandler = new Mock<IWebSocketHandler>();
        _mockScopeFactory = new Mock<IServiceScopeFactory>();
        _mockDeviceService = new Mock<IDeviceService>();
        _mockOpenConnectionRequestRepository = new Mock<IOpenConnectionRequestRepository>();
        _mockConnectionInitiationService = new Mock<IConnectionInitiationService>();
        _service = new TokenConnectService(
            _mockHandler.Object,
            NullLogger<TokenConnectService>.Instance,
            _mockOpenConnectionRequestRepository.Object,
            _mockConnectionInitiationService.Object
        );
    }

    [Test]
    public async Task HandleCloseConnection_ForwardsMessage()
    {
        var clientId = "ABCDE";
        var remoteToken = "BCDEF";

        var msg = new CloseConnectionMessage { RemoteToken = remoteToken };

        await _service.HandleCloseConnection(clientId, msg);

        _mockHandler.Verify(h =>
            h.SendMessage(
                remoteToken,
                It.Is<CloseConnectionMessage>(m => m.RemoteToken == clientId)
            )
        );
    }

    [Test]
    public async Task HandleConnectionRequest_RemoteNotFound_SendsRejection()
    {
        var clientId = "ABCDE";
        var remoteToken = "BCDEF";

        _mockHandler.Setup(h => h.RemoteTokenExists(remoteToken)).Returns(false);

        var msg = new ConnectionRequestMessage { RemoteToken = remoteToken };

        await _service.HandleConnectionRequest(clientId, msg);

        _mockHandler.Verify(h =>
            h.SendMessage(
                clientId,
                It.Is<ConnectionResponseMessage>(m =>
                    m.Accepted == false && m.RemoteToken == remoteToken
                )
            )
        );
    }

    [Test]
    public async Task HandleConnectionRequest_RemoteFound_StoresRequestAndForwards()
    {
        var clientId = "ABCDE";
        var remoteToken = "BCDEF";

        _mockHandler.Setup(h => h.RemoteTokenExists(remoteToken)).Returns(true);

        var msg = new ConnectionRequestMessage { RemoteToken = remoteToken };

        await _service.HandleConnectionRequest(clientId, msg);

        _mockHandler.Verify(h =>
            h.SendMessage(
                remoteToken,
                It.Is<ConnectionRequestMessage>(m => m.RemoteToken == clientId)
            )
        );
    }

    [Test]
    public async Task HandleConnectionResponse_TokensMismatch_DoesNothing()
    {
        var clientId = "ABCDE";
        var remoteToken = "BCDEF";

        var msg = new ConnectionResponseMessage { RemoteToken = remoteToken, Accepted = true };

        // Internal state not prepared with open request
        await _service.HandleConnectionResponse(clientId, msg);

        _mockHandler.Verify(
            h => h.SendMessage(It.IsAny<string>(), It.IsAny<ConnectionResponseMessage>()),
            Times.Never
        );
        _mockHandler.Verify(
            h => h.SendMessage(It.IsAny<string>(), It.IsAny<EstablishConnectionMessage>()),
            Times.Never
        );
    }

    [Test]
    public async Task HandleConnectionResponse_Accepted_SendsConnectionEstablishedMessages()
    {
        var peerA = "ABCDE";
        var peerB = "BCDEF";

        _mockHandler.Setup(h => h.RemoteTokenExists(peerB)).Returns(true);

        // Set up repository to store and retrieve the request
        string storedTarget = string.Empty;
        _mockOpenConnectionRequestRepository
            .Setup(r => r.Add(peerA, peerB))
            .Callback<string, string>((requester, target) => storedTarget = target);
#pragma warning disable CS8601 // Possible null reference assignment.
        _mockOpenConnectionRequestRepository
            .Setup(r => r.TryRemove(peerA, out It.Ref<string>.IsAny))
            .Returns(
                (string requester, out string target) =>
                {
                    target = storedTarget;
                    var result = !string.IsNullOrEmpty(storedTarget);
                    storedTarget = string.Empty;
                    return result;
                }
            );
#pragma warning restore CS8601 // Possible null reference assignment.

        await _service.HandleConnectionRequest(
            peerA,
            new ConnectionRequestMessage { RemoteToken = peerB }
        );
        _mockHandler.Setup(h => h.RemoteTokenExists(peerA)).Returns(true);

        var response = new ConnectionResponseMessage { RemoteToken = peerA, Accepted = true };

        await _service.HandleConnectionResponse(peerB, response);

        _mockHandler.Verify(h =>
            h.SendMessage(
                peerA,
                It.Is<ConnectionResponseMessage>(m => m.Accepted && m.RemoteToken == peerB)
            )
        );

        _mockConnectionInitiationService.Verify(
            s => s.InitiateConnection(peerA, peerB),
            Times.Once
        );
    }

    [Test]
    public async Task HandleConnectionRequestCancelled_RemoteTokenExists_ForwardCancellation()
    {
        var requester = "ABCDE";
        var responder = "BCDEF";

        _mockHandler.Setup(h => h.RemoteTokenExists(responder)).Returns(true);

        // Set up repository to store and retrieve the request
        string storedTarget = string.Empty;
        _mockOpenConnectionRequestRepository
            .Setup(r => r.Add(requester, responder))
            .Callback<string, string>((req, target) => storedTarget = target);
#pragma warning disable CS8601 // Possible null reference assignment.
        _mockOpenConnectionRequestRepository
            .Setup(r => r.TryRemove(requester, out It.Ref<string>.IsAny))
            .Returns(
                (string req, out string target) =>
                {
                    target = storedTarget;
                    var result = !string.IsNullOrEmpty(storedTarget);
                    storedTarget = string.Empty;
                    return result;
                }
            );
#pragma warning restore CS8601 // Possible null reference assignment.

        await _service.HandleConnectionRequest(
            requester,
            new ConnectionRequestMessage { RemoteToken = responder }
        );

        // Need to ensure RemoteTokenExists returns true for responder when HandleConnectionRequestCancelled checks
        _mockHandler.Setup(h => h.RemoteTokenExists(responder)).Returns(true);

        await _service.HandleConnectionRequestCancelled(
            requester,
            new ConnectionRequestCancelledMessage { RemoteToken = responder }
        );

        _mockHandler.Verify(h =>
            h.SendMessage(
                responder,
                It.Is<ConnectionRequestCancelledMessage>(m => m.RemoteToken == requester)
            )
        );
    }
}
