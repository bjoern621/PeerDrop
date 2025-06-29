
using System.Net.WebSockets;

namespace backend.WebSocketComponent.Logic.Types;

public class RuntimeClientInformation
{
    public required WebSocket WebSocket { get; set; }
    public int? UserId { get; set; } // This is technically a violation of the single responsibility principle, but there is no other (secure) way to get the user ID from the client token.
}