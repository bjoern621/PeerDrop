using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.DeviceComponent.Common.DTOs;

public class DeviceLoginDto
{
    [Required]
    [JsonPropertyName("displayName")]
    public required string DisplayName { get; set; }

    [Required]
    [JsonPropertyName("isCurrentDevice")]
    public required bool IsCurrentDevice { get; set; }

    [Required]
    [JsonPropertyName("uuid")]
    public required Guid Uuid { get; set; }
}
