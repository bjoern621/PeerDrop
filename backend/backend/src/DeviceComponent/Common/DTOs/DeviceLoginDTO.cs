using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.src.DeviceComponent.Common.DTOs;

public class DeviceLoginDto
{
    [Required]
    [JsonPropertyName("displayName")]
    public required string DisplayName { get; set; }
    [Required]
    [JsonPropertyName("isCurrentDevice")]
    public required Boolean IsCurrentDevice { get; set; }
}
