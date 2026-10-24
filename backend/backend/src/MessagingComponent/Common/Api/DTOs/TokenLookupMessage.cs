using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Common.Api.DTOs;

/// <summary>
/// Asks whether a client is online, by its token or by the UUID of an own device.
/// Carries exactly one of the two. The server answers with a <see cref="TokenStatusMessage"/>.
/// </summary>
public class TokenLookupMessage : ITypedMessage
{
    public static string TypeString => "token-lookup";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("token")]
    public string? Token { get; set; }

    [JsonPropertyName("deviceUuid")]
    public Guid? DeviceUuid { get; set; }
}
