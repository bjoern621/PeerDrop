using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.DeviceComponent.Common.DTOs;

public class DeviceLoginDto
{
    [Required]
    [JsonPropertyName("uuid")]
    public required Guid Uuid { get; set; }
}
