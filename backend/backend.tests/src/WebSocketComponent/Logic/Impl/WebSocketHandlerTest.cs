using System.Net.WebSockets;
using System.Text;
using backend.WebSocketComponent.Logic.Impl;

namespace backend.tests.WebSocketComponent.Logic.Impl;

[Category("UnitTest")]
public class WebSocketHandlerTest
{
    /// <summary>
    /// Hands out the queued frames one per receive, cut to the receive buffer.
    /// </summary>
    private class FrameQueueWebSocket(params (string Text, bool EndOfMessage)[] frames) : WebSocket
    {
        private readonly Queue<(byte[] Bytes, bool EndOfMessage)> _frames =
            new(frames.Select(frame => (Encoding.UTF8.GetBytes(frame.Text), frame.EndOfMessage)));

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
        public override Task SendAsync(ArraySegment<byte> buffer, WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    [Test]
    public async Task ReceiveMessage_MessageOverSeveralFrames_AssemblesWholeMessage()
    {
        var socket = new FrameQueueWebSocket(("""{"type":"te""", false), ("""xt","msg":""", false), ("{}}", true));

        var (message, closeStatus) = await WebSocketHandler.ReceiveMessage(socket, new byte[16], 1024);

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

        var (message, _) = await WebSocketHandler.ReceiveMessage(socket, new byte[8], 10);

        Assert.That(message, Is.EqualTo("1234567812"));
    }

    [Test]
    public async Task ReceiveMessage_MessageAboveLimit_ClosesWithMessageTooBig()
    {
        var socket = new FrameQueueWebSocket(("12345678", false), ("123", true));

        var (message, closeStatus) = await WebSocketHandler.ReceiveMessage(socket, new byte[8], 10);

        Assert.Multiple(() =>
        {
            Assert.That(message, Is.Null);
            Assert.That(closeStatus, Is.EqualTo(WebSocketCloseStatus.MessageTooBig));
        });
    }

    [Test]
    public async Task ReceiveMessage_CloseFrame_ClosesNormally()
    {
        var (message, closeStatus) = await WebSocketHandler.ReceiveMessage(new FrameQueueWebSocket(), new byte[8], 10);

        Assert.Multiple(() =>
        {
            Assert.That(message, Is.Null);
            Assert.That(closeStatus, Is.EqualTo(WebSocketCloseStatus.NormalClosure));
        });
    }
}
