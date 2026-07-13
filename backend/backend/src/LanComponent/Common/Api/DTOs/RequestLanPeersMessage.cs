using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.LanComponent.Common.Api.DTOs;

/// <summary>
/// Sent by a client to request its current LAN peer list, e.g. when the
/// connect page mounts. The server answers with a <see cref="LanPeersMessage"/>.
/// Carries no payload.
/// </summary>
public class RequestLanPeersMessage : ITypedMessage
{
    public static string TypeString => "lan-peers-request";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;
}
