using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using backend.WebSocketComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Logic.Impl;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;

namespace backend.tests.WebSocketComponent.Logic.Impl;

[Category("UnitTest")]
public class WebSocketTransportTest
{
    /// <summary>
    /// Hands out the queued frames one per receive, cut to the receive buffer, then closes.
    /// Keeps every message that the server sends.
    /// </summary>
    private class FrameQueueWebSocket(params (string Text, bool EndOfMessage)[] frames) : WebSocket
    {
        private readonly Queue<(byte[] Bytes, bool EndOfMessage)> _frames =
            new(frames.Select(frame => (Encoding.UTF8.GetBytes(frame.Text), frame.EndOfMessage)));
        public readonly List<string> Sent = [];

        public override Task<WebSocketReceiveResult> ReceiveAsync(ArraySegment<byte> buffer, CancellationToken cancellationToken)
        {
            if (!_frames.TryDequeue(out var frame))
                return Task.FromResult(new WebSocketReceiveResult(0, WebSocketMessageType.Close, true));

            frame.Bytes.CopyTo(buffer.Array!, buffer.Offset);
            return Task.FromResult(new WebSocketReceiveResult(frame.Bytes.Length, WebSocketMessageType.Text, frame.EndOfMessage));
        }

        public override WebSocketCloseStatus? CloseStatus => null;
        public override string? CloseStatusDescription => null;
        public override WebSocketState State => WebSocketState.Open;
        public override string? SubProtocol => null;
        public override void Abort() { }
        public override Task CloseAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken) => Task.CompletedTask;
        public override Task CloseOutputAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken) => Task.CompletedTask;
        public override void Dispose() { }

        public override Task SendAsync(ArraySegment<byte> buffer, WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken)
        {
            Sent.Add(Encoding.UTF8.GetString(buffer));
            return Task.CompletedTask;
        }
    }

    [Test]
    public async Task ReceiveMessage_MessageOverSeveralFrames_AssemblesWholeMessage()
    {
        var socket = new FrameQueueWebSocket(("""{"type":"te""", false), ("""xt","msg":""", false), ("{}}", true));

        var (message, closeStatus) = await WebSocketTransport.ReceiveMessage(socket, new byte[16], 1024);

        Assert.Multiple(() =>
        {
            Assert.That(message, Is.EqualTo("""{"type":"text","msg":{}}"""));
            Assert.That(closeStatus, Is.Null);
        });
    }

    [Test]
    public async Task ReceiveMessage_MessageAtLimit_IsReceived()
    {
        var socket = new FrameQueueWebSocket(("12345678", false), ("12", true));

        var (message, _) = await WebSocketTransport.ReceiveMessage(socket, new byte[8], 10);

        Assert.That(message, Is.EqualTo("1234567812"));
    }

    [Test]
    public async Task ReceiveMessage_MessageAboveLimit_ClosesWithMessageTooBig()
    {
        var socket = new FrameQueueWebSocket(("12345678", false), ("123", true));

        var (message, closeStatus) = await WebSocketTransport.ReceiveMessage(socket, new byte[8], 10);

        Assert.Multiple(() =>
        {
            Assert.That(message, Is.Null);
            Assert.That(closeStatus, Is.EqualTo(WebSocketCloseStatus.MessageTooBig));
        });
    }

    [Test]
    public async Task ReceiveMessage_CloseFrame_ClosesNormally()
    {
        var (message, closeStatus) = await WebSocketTransport.ReceiveMessage(new FrameQueueWebSocket(), new byte[8], 10);

        Assert.Multiple(() =>
        {
            Assert.That(message, Is.Null);
            Assert.That(closeStatus, Is.EqualTo(WebSocketCloseStatus.NormalClosure));
        });
    }

    private class AcceptingWebSocketFeature(WebSocket socket) : IHttpWebSocketFeature
    {
        public bool IsWebSocketRequest => true;
        public Task<WebSocket> AcceptAsync(WebSocketAcceptContext context) => Task.FromResult(socket);
    }

    private static Task Serve(WebSocketTransport transport, WebSocket socket)
    {
        var context = new DefaultHttpContext();
        context.Features.Set<IHttpWebSocketFeature>(new AcceptingWebSocketFeature(socket));
        return transport.HandleConnect(context);
    }

    [Test]
    public async Task HandleConnect_Ping_AnswersWithPongAndRaisesNothing()
    {
        var transport = new WebSocketTransport();
        var received = new List<string>();
        transport.MessageReceived += (_, type, _) =>
        {
            received.Add(type);
            return Task.CompletedTask;
        };
        var socket = new FrameQueueWebSocket(("""{"type":"ping","msg":{}}""", true));

        await Serve(transport, socket);

        Assert.Multiple(() =>
        {
            Assert.That(socket.Sent, Does.Contain("""{"type":"pong","msg":{}}"""));
            Assert.That(received, Is.Empty);
        });
    }

    [Test]
    public async Task HandleConnect_Messages_RaisesOpenedThenEachMessageThenClosedUnderOneId()
    {
        var transport = new WebSocketTransport();
        var events = new List<(string Event, Guid Id)>();
        transport.ConnectionOpened += (id, _) =>
        {
            events.Add(("opened", id));
            return Task.CompletedTask;
        };
        transport.MessageReceived += (id, type, _) =>
        {
            events.Add((type, id));
            return Task.CompletedTask;
        };
        transport.ConnectionClosed += id =>
        {
            events.Add(("closed", id));
            return Task.CompletedTask;
        };
        var socket = new FrameQueueWebSocket(("""{"type":"hello","msg":{}}""", true), ("""{"type":"text","msg":{}}""", true));

        await Serve(transport, socket);

        Assert.Multiple(() =>
        {
            Assert.That(events.Select(e => e.Event), Is.EqualTo(new[] { "opened", "hello", "text", "closed" }));
            Assert.That(events.Select(e => e.Id).Distinct().Count(), Is.EqualTo(1));
        });
    }

    [Test]
    public async Task SendMessage_UnknownConnection_ReturnsFalse()
    {
        var transport = new WebSocketTransport();

        Assert.That(await transport.SendMessage(Guid.NewGuid(), new PongMessage()), Is.False);
    }
}
