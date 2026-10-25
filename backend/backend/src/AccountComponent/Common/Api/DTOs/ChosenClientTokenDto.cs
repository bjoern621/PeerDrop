using System.Text.Json.Serialization;

namespace backend.AccountComponent.Common.Api.DTOs;

public class ChosenClientTokenDto
{
    [JsonPropertyName("token")]
    public required string Token { get; set; }
}
