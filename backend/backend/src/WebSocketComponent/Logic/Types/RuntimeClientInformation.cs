using System.Net.WebSockets;

namespace backend.WebSocketComponent.Logic.Types;

public class RuntimeClientInformation
{
    public required WebSocket WebSocket { get; set; }

    /// <summary>
    /// Serializes sends on <see cref="WebSocket"/>, which allows one outstanding send at a time.
    /// </summary>
    public SemaphoreSlim SendLock { get; } = new(1, 1);

    public int? UserId { get; set; } // This is technically a violation of the single responsibility principle, but there is no other (secure) way to get the user ID from the client token.

    /// <summary>
    /// Remote IP address the client connected from. Used to group clients that
    /// share a public IP into the same local network for LAN discovery.
    /// Null if the address could not be determined.
    /// </summary>
    public string? RemoteIpAddress { get; set; }

    /// <summary>
    /// User-Agent header sent when the WebSocket connection was opened.
    /// Null if the client did not send one.
    /// </summary>
    public string? UserAgent { get; set; }

    private TaskCompletionSource _nextMessage = new(TaskCreationOptions.RunContinuationsAsynchronously);

    /// <summary>
    /// Completes with the next message received from the client.
    /// </summary>
    public Task NextMessage => Volatile.Read(ref _nextMessage).Task;

    /// <summary>
    /// Completes <see cref="NextMessage"/> and hands out a fresh one for the message after.
    /// Called by the connection's receive loop alone.
    /// </summary>
    public void ReportMessage()
    {
        var reported = Interlocked.Exchange(
            ref _nextMessage, new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously));
        reported.SetResult();
    }

    /// <summary>
    /// Completes once the connection left the active connections and every disconnect handler ran.
    /// </summary>
    public TaskCompletionSource Closed { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
}
