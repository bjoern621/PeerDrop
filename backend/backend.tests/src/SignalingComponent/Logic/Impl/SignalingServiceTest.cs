using System.Text.Json;
using backend.SignalingComponent.Common.Api.DTOs;
using backend.SignalingComponent.Logic.Impl;
using backend.WebSocketComponent.Logic.Api;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using backend.SignalingComponent.Logic.Api;

namespace backend.tests.SignalingComponent.Logic.Impl;

[Category("UnitTest")]
public class SignalingServiceTest
{
    private Mock<IWebSocketHandler> _mockHandler;
    private ISignalingService _service;

    [SetUp]
    public void Setup()
    {
        _mockHandler = new Mock<IWebSocketHandler>();
        _service = new SignalingService(_mockHandler.Object, NullLogger<SignalingService>.Instance);
    }

    [Test]
    public async Task HandleRemoteTokenMessage_RemoteTokenNotFound_SendsErrorMessage()
    {
        var clientId = "ABCDE";
        var requestId = "req1";
        var remoteToken = "BCDEF";

        _mockHandler.Setup(h => h.RemoteTokenExists(remoteToken)).Returns(false);

        var message = new RemoteTokenMessage { RemoteToken = remoteToken, RequestId = requestId };

        await _service.HandleRemoteTokenMessage(clientId, message);

        _mockHandler.Verify(h => h.SendMessage(clientId,
            It.Is<ErrorMessage>(m => m.RequestId == requestId && m.Description.Contains("does not exist"))));
    }

    [Test]
    public async Task HandleRemoteTokenMessage_RemoteTokenFound_SendsSuccessAndResponse()
    {
        var clientId = "ABCDE";
        var remoteToken = "BCDEF";
        var requestId = "req42";

        _mockHandler.Setup(h => h.RemoteTokenExists(remoteToken)).Returns(true);

        var message = new RemoteTokenMessage { RemoteToken = remoteToken, RequestId = requestId };

        await _service.HandleRemoteTokenMessage(clientId, message);

        _mockHandler.Verify(h => h.SendMessage(clientId,
            It.Is<SuccessMessage>(m => m.RequestId == requestId && m.Description.Contains("exists"))));

        _mockHandler.Verify(h => h.SendMessage(remoteToken,
            It.Is<RemoteTokenMessage>(m => m.RemoteToken == clientId && m.RequestId == requestId)));
    }

    [Test]
    public async Task HandleIceCandidateMessage_ForwardsMessage()
    {
        var clientId = "ABCDE";
        var remoteToken = "BCDEF";
        var iceJson = """
                      {
                        "candidate": "candidate:1 1 UDP 1686052607 2001:db8::1 12345 typ srflx raddr 0.0.0.0 rport 0",
                        "sdpMLineIndex": 0,
                        "sdpMid": "0",
                        "usernameFragment": "exampleUser"
                      }
                      """;
        using var doc = JsonDocument.Parse(iceJson);
        JsonElement iceElement = doc.RootElement.Clone(); // Clone to keep it alive after disposing

        var iceMsg = new IceCandidateMessage()
        {
            RemoteToken = remoteToken,
            IceCandidate = iceElement
        };

        await _service.HandleIceCandidateMessage(clientId, iceMsg);

        _mockHandler.Verify(h => h.SendMessage(
            remoteToken,
            It.Is<IceCandidateMessage>(msg =>
                msg.RemoteToken == clientId &&
                JsonElement.DeepEquals(msg.IceCandidate, iceElement)
            )
        ), Times.Once);
    }

    [Test]
    public async Task HandleSdpMessage_ForwardsMessage()
    {
        var clientId = "ABCDE";
        var remoteToken = "BCDEF";
        var sdpJson = """
                      {
                        "type": "offer",
                        "sdp": "v=0\r\no=exampleUser 1234567890 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=sendrecv\r\na=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99\r\na=group:BUNDLE 0\r\na=ice-options:trickle\r\na=msid-semantic:WMS *\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=sendrecv\r\na=extmap-allow-mixed\r\na=ice-pwd:examplePassword123\r\na=ice-ufrag:exampleUfrag456\r\na=mid:0\r\na=setup:actpass\r\na=sctp-port:5000\r\na=max-message-size:1073741823\r\n"
                      }
                      """;
        using var doc = JsonDocument.Parse(sdpJson);
        JsonElement sdpElement = doc.RootElement.Clone(); // Clone to keep it alive after disposing

        var sdpMessage = new SdpMessage
        {
            RemoteToken = remoteToken,
            Description = sdpElement
        };

        await _service.HandleSdpMessage(clientId, sdpMessage);


        _mockHandler.Verify(h => h.SendMessage(
            remoteToken,
            It.Is<SdpMessage>(msg =>
                msg.RemoteToken == clientId &&
                JsonElement.DeepEquals(msg.Description, sdpElement)
            )
        ), Times.Once);
    }
}
