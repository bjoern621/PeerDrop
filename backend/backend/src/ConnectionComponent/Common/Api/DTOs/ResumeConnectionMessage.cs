using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.ConnectionComponent.Common.Api.DTOs;

/// <summary>
/// Claims a peer connection whose direct link outlived the server's record of it.
/// The client sends it naming the partner, which gets it naming the claimant.
/// The server records the pair as connected once both sides claimed it.
/// </summary>
public class ResumeConnectionMessage : ITypedMessage
{
    public static string TypeString => "resume-connection";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("remoteToken")]
    public required string RemoteToken { get; set; }
}
