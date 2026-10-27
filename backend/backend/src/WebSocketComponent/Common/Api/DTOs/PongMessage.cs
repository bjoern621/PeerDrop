using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.Api.DTOs;

/// <summary>
/// Answers a ping from the client, which checks with it that the connection still carries messages.
/// </summary>
public class PongMessage : ITypedMessage
{
    public static string TypeString => "pong";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;
}
