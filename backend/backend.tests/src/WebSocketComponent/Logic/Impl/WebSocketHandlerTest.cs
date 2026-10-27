using System.Diagnostics;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using backend.WebSocketComponent.Logic.Impl;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Logging.Abstractions;

namespace backend.tests.WebSocketComponent.Logic.Impl;

[Category("UnitTest")]
public class WebSocketHandlerTest
{
    private const string GeneratedTokenPattern = "^[bdfghjklmnprstvz][aiou][bdfghjklmnprstvz][aiou][bdfghjklmnprstvz]$";

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

    /// <summary>
    /// Stays open until <see cref="Close"/> or an abort and keeps the first message that the server sends.
    /// Answers a ping from the server with a pong if <paramref name="answersPings"/> holds.
    /// </summary>
    private class HeldOpenWebSocket(bool answersPings = false) : WebSocket
    {
        private const string PongJson = """{"type":"pong","msg":{}}""";
        // Null stands for the close frame.
        private readonly Channel<string?> _incoming = Channel.CreateUnbounded<string?>();
        private bool _closed;
        public readonly TaskCompletionSource<string> FirstSent = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public void Close() => _incoming.Writer.TryWrite(null);

        public override async Task<WebSocketReceiveResult> ReceiveAsync(ArraySegment<byte> buffer, CancellationToken cancellationToken)
        {
            var text = await _incoming.Reader.ReadAsync(cancellationToken);
            if (text == null)
            {
                _closed = true;
                return new WebSocketReceiveResult(0, WebSocketMessageType.Close, true);
            }

            var bytes = Encoding.UTF8.GetBytes(text);
            bytes.CopyTo(buffer.Array!, buffer.Offset);
            return new WebSocketReceiveResult(bytes.Length, WebSocketMessageType.Text, true);
        }

        public override Task SendAsync(ArraySegment<byte> buffer, WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken)
        {
            var text = Encoding.UTF8.GetString(buffer);
            FirstSent.TrySetResult(text);
            if (answersPings && text.Contains("\"type\":\"ping\""))
                _incoming.Writer.TryWrite(PongJson);
            return Task.CompletedTask;
        }

        public override WebSocketCloseStatus? CloseStatus => null;
        public override string? CloseStatusDescription => null;
        public override WebSocketState State => _closed ? WebSocketState.Closed : WebSocketState.Open;
        public override string? SubProtocol => null;
        public override void Abort() => Close();
        public override Task CloseAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken) => Task.CompletedTask;
        public override Task CloseOutputAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken) => Task.CompletedTask;
        public override void Dispose() { }
    }

    private class AcceptingWebSocketFeature(WebSocket socket) : IHttpWebSocketFeature
    {
        public bool IsWebSocketRequest => true;
        public Task<WebSocket> AcceptAsync(WebSocketAcceptContext context) => Task.FromResult(socket);
    }

    /// <summary>
    /// Opens a connection that stays open until the socket closes. Returns the client token that the server sent.
    /// </summary>
    private static async Task<(Task Serving, string ClientToken)> Connect(
        WebSocketHandler handler, HeldOpenWebSocket socket, string? requestedToken)
    {
        var context = new DefaultHttpContext();
        context.Features.Set<IHttpWebSocketFeature>(new AcceptingWebSocketFeature(socket));

        var serving = handler.HandleConnect(context, requestedToken);
        using var message = JsonDocument.Parse(await socket.FirstSent.Task);
        var clientToken = message.RootElement.GetProperty("msg").GetProperty("token").GetString()!;

        return (serving, clientToken);
    }

    [Test]
    public async Task HandleConnect_FreeRequestedToken_AssignsRequestedToken()
    {
        var handler = new WebSocketHandler(NullLogger<WebSocketHandler>.Instance);
        var socket = new HeldOpenWebSocket();

        var (serving, clientToken) = await Connect(handler, socket, "aaaaa");
        socket.Close();
        await serving;

        Assert.That(clientToken, Is.EqualTo("aaaaa"));
    }

    [Test]
    public async Task HandleConnect_RequestedTokenHeldByAnsweringConnection_AssignsGeneratedToken()
    {
        var handler = new WebSocketHandler(NullLogger<WebSocketHandler>.Instance);
        var first = new HeldOpenWebSocket(answersPings: true);
        var second = new HeldOpenWebSocket();

        var (firstServing, firstToken) = await Connect(handler, first, "aaaaa");
        var (secondServing, secondToken) = await Connect(handler, second, "aaaaa");
        first.Close();
        second.Close();
        await Task.WhenAll(firstServing, secondServing);

        Assert.Multiple(() =>
        {
            Assert.That(firstToken, Is.EqualTo("aaaaa"));
            Assert.That(secondToken, Does.Match(GeneratedTokenPattern));
        });
    }

    [Test]
    public async Task HandleConnect_RequestedTokenHeldByAnsweringConnection_AnswersWithoutWaitingForTheProbeTimeout()
    {
        var handler = new WebSocketHandler(NullLogger<WebSocketHandler>.Instance);
        var first = new HeldOpenWebSocket(answersPings: true);
        var second = new HeldOpenWebSocket();
        var (firstServing, _) = await Connect(handler, first, "aaaaa");

        var stopwatch = Stopwatch.StartNew();
        var (secondServing, _) = await Connect(handler, second, "aaaaa");
        stopwatch.Stop();
        first.Close();
        second.Close();
        await Task.WhenAll(firstServing, secondServing);

        Assert.That(stopwatch.Elapsed, Is.LessThan(TimeSpan.FromSeconds(1)));
    }

    [Test]
    public async Task HandleConnect_RequestedTokenHeldBySilentConnection_TakesTokenOver()
    {
        var handler = new WebSocketHandler(NullLogger<WebSocketHandler>.Instance);
        var first = new HeldOpenWebSocket();
        var second = new HeldOpenWebSocket();

        var (firstServing, _) = await Connect(handler, first, "aaaaa");
        var (secondServing, secondToken) = await Connect(handler, second, "aaaaa");
        second.Close();
        await Task.WhenAll(firstServing, secondServing);

        Assert.That(secondToken, Is.EqualTo("aaaaa"));
    }

    [Test]
    public async Task HandleConnect_RequestedTokenReleased_AssignsRequestedTokenAgain()
    {
        var handler = new WebSocketHandler(NullLogger<WebSocketHandler>.Instance);
        var first = new HeldOpenWebSocket();
        var second = new HeldOpenWebSocket();

        var (firstServing, _) = await Connect(handler, first, "aaaaa");
        first.Close();
        await firstServing;
        var (secondServing, secondToken) = await Connect(handler, second, "aaaaa");
        second.Close();
        await secondServing;

        Assert.That(secondToken, Is.EqualTo("aaaaa"));
    }

    [Test]
    public async Task HandleConnect_UppercaseRequestedToken_AssignsLowercase()
    {
        var handler = new WebSocketHandler(NullLogger<WebSocketHandler>.Instance);
        var socket = new HeldOpenWebSocket();

        var (serving, clientToken) = await Connect(handler, socket, "AB12C");
        socket.Close();
        await serving;

        Assert.That(clientToken, Is.EqualTo("ab12c"));
    }

    [TestCase("abcd")]
    [TestCase("abcdef")]
    [TestCase("ab-cd")]
    public async Task HandleConnect_RequestedTokenOutsideFormat_AssignsGeneratedToken(string requestedToken)
    {
        var handler = new WebSocketHandler(NullLogger<WebSocketHandler>.Instance);
        var socket = new HeldOpenWebSocket();

        var (serving, clientToken) = await Connect(handler, socket, requestedToken);
        socket.Close();
        await serving;

        Assert.That(clientToken, Does.Match(GeneratedTokenPattern));
    }

    [Test]
    public async Task HandleConnect_Ping_AnswersWithPong()
    {
        var handler = new WebSocketHandler(NullLogger<WebSocketHandler>.Instance);
        var socket = new FrameQueueWebSocket(("""{"type":"ping","msg":{}}""", true));
        var context = new DefaultHttpContext();
        context.Features.Set<IHttpWebSocketFeature>(new AcceptingWebSocketFeature(socket));

        await handler.HandleConnect(context, null);

        Assert.That(socket.Sent, Does.Contain("""{"type":"pong","msg":{}}"""));
    }
}
