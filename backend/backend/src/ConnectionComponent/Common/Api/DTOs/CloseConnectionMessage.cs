using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.ConnectionComponent.Common.Api.DTOs;

public class CloseConnectionMessage : ITypedMessage
{
    public static string TypeString => "close-connection";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("remoteToken")]
    public required string RemoteToken { get; set; }

    /// <summary>
    /// True if the partner lost its server connection without closing the peer connection.
    /// The direct link between the two may outlive it, see <see cref="ResumeConnectionMessage"/>.
    /// </summary>
    [JsonPropertyName("gone")]
    public bool Gone { get; set; }
}
