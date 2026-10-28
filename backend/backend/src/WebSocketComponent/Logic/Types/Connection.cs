using System.Net.WebSockets;
using backend.WebSocketComponent.Common.Api;

namespace backend.WebSocketComponent.Logic.Types;

public class Connection
{
    public required WebSocket WebSocket { get; init; }

    public required ClientConnectionInfo Info { get; init; }

    /// <summary>
    /// Serializes sends on <see cref="WebSocket"/>, which allows one outstanding send at a time.
    /// </summary>
    public SemaphoreSlim SendLock { get; } = new(1, 1);
}
