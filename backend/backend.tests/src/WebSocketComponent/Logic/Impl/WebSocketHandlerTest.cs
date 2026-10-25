using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using backend.WebSocketComponent.Logic.Impl;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Logging.Abstractions;

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

    /// <summary>
    /// Stays open until <see cref="Close"/> and keeps the first message that the server sends.
    /// </summary>
    private class HeldOpenWebSocket : WebSocket
    {
        private readonly TaskCompletionSource _closed = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public readonly TaskCompletionSource<string> FirstSent = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public void Close() => _closed.TrySetResult();

        public override async Task<WebSocketReceiveResult> ReceiveAsync(ArraySegment<byte> buffer, CancellationToken cancellationToken)
        {
            await _closed.Task;
            return new WebSocketReceiveResult(0, WebSocketMessageType.Close, true);
        }

        public override Task SendAsync(ArraySegment<byte> buffer, WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken)
        {
            FirstSent.TrySetResult(Encoding.UTF8.GetString(buffer));
            return Task.CompletedTask;
        }

        public override WebSocketCloseStatus? CloseStatus => null;
        public override string? CloseStatusDescription => null;
        public override WebSocketState State => _closed.Task.IsCompleted ? WebSocketState.Closed : WebSocketState.Open;
        public override string? SubProtocol => null;
        public override void Abort() { }
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
        WebSocketHandler handler, HeldOpenWebSocket socket, string? chosenToken)
    {
        var context = new DefaultHttpContext();
        context.Features.Set<IHttpWebSocketFeature>(new AcceptingWebSocketFeature(socket));

        var serving = handler.HandleConnect(context, chosenToken);
        using var message = JsonDocument.Parse(await socket.FirstSent.Task);
        var clientToken = message.RootElement.GetProperty("msg").GetProperty("token").GetString()!;

        return (serving, clientToken);
    }

    [Test]
    public async Task HandleConnect_FreeChosenToken_AssignsChosenToken()
    {
        var handler = new WebSocketHandler(NullLogger<WebSocketHandler>.Instance);
        var socket = new HeldOpenWebSocket();

        var (serving, clientToken) = await Connect(handler, socket, "aaaaa");
        socket.Close();
        await serving;

        Assert.That(clientToken, Is.EqualTo("aaaaa"));
    }

    [Test]
    public async Task HandleConnect_ChosenTokenHeldByAnotherConnection_AssignsGeneratedToken()
    {
        var handler = new WebSocketHandler(NullLogger<WebSocketHandler>.Instance);
        var first = new HeldOpenWebSocket();
        var second = new HeldOpenWebSocket();

        var (firstServing, firstToken) = await Connect(handler, first, "aaaaa");
        var (secondServing, secondToken) = await Connect(handler, second, "aaaaa");
        first.Close();
        second.Close();
        await Task.WhenAll(firstServing, secondServing);

        Assert.Multiple(() =>
        {
            Assert.That(firstToken, Is.EqualTo("aaaaa"));
            Assert.That(secondToken, Does.Match("^[bdfghjklmnprstvz][aiou][bdfghjklmnprstvz][aiou][bdfghjklmnprstvz]$"));
        });
    }

    [Test]
    public async Task HandleConnect_ChosenTokenReleased_AssignsChosenTokenAgain()
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
}
