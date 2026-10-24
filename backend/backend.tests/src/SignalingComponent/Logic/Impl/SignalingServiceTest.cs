using System.Text.Json;
using backend.ConnectionComponent.Dataaccess.Api;
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
    private Mock<IPairRepository> _mockPairRepository;
    private ISignalingService _service;

    [SetUp]
    public void Setup()
    {
        _mockHandler = new Mock<IWebSocketHandler>();
        _mockPairRepository = new Mock<IPairRepository>();
        _mockPairRepository.Setup(r => r.AreConnected("ABCDE", "BCDEF")).Returns(true);
        _service = new SignalingService(_mockHandler.Object, _mockPairRepository.Object, NullLogger<SignalingService>.Instance);
    }

    [Test]
    public async Task HandleIceCandidateMessage_ConnectedPair_ForwardsMessage()
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
    public async Task HandleSdpMessage_ConnectedPair_ForwardsMessage()
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

    [Test]
    public async Task HandleSdpMessage_NotConnected_DropsMessage()
    {
        using var doc = JsonDocument.Parse("""{"type": "offer", "sdp": "v=0"}""");

        await _service.HandleSdpMessage("ABCDE", new SdpMessage { RemoteToken = "CDEFG", Description = doc.RootElement });

        _mockHandler.Verify(h => h.SendMessage(It.IsAny<string>(), It.IsAny<SdpMessage>()), Times.Never);
    }

    [Test]
    public async Task HandleIceCandidateMessage_NotConnected_DropsMessage()
    {
        using var doc = JsonDocument.Parse("""{"candidate": ""}""");

        await _service.HandleIceCandidateMessage("ABCDE", new IceCandidateMessage { RemoteToken = "CDEFG", IceCandidate = doc.RootElement });

        _mockHandler.Verify(h => h.SendMessage(It.IsAny<string>(), It.IsAny<IceCandidateMessage>()), Times.Never);
    }
}
