using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.AccountComponent.Common.DTOs;

public class AccountRetrieveDto
{
    [Required]
    [JsonPropertyName("username")]
    public required string DisplayName { get; set; }
    
    [Required]
    [JsonPropertyName("password")]
    public required string Password { get; set; }
    
    [Required]
    [JsonPropertyName("id")]
    public required int Id { get; set; }
}