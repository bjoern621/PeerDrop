using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.DeviceComponent.Common.DTOs;

public class DeviceRegisterDto
{
    [Required]
    [JsonPropertyName("accountId")]
    public required int AccountId { get; set; }
}
