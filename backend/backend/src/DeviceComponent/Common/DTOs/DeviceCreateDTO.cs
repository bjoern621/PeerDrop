using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.DeviceComponent.Common.DTOs;

public class DeviceCreateDto
{
    [Required]
    [StringLength(100, MinimumLength = 3)]
    [JsonPropertyName("displayname")]
    public required string DisplayName { get; set; }
    [Required]
    [MinLength(5)]
    [JsonPropertyName("accountId")]
    public required int AccountId { get; set; }
}
