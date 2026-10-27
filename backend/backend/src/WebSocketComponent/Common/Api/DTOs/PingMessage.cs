using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.Api.DTOs;

/// <summary>
/// Asks the client to answer with a pong, which proves that its connection still carries messages.
/// </summary>
public class PingMessage : ITypedMessage
{
    public static string TypeString => "ping";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;
}
