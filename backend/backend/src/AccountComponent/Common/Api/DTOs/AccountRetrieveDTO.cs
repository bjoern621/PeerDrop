using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.AccountComponent.Common.Api.DTOs;

public class AccountRetrieveDto
{
    [Required]
    [JsonPropertyName("username")]
    public required string DisplayName { get; set; }
    
    // Password hash is used server-side only and must never be serialized to a client
    [Required]
    [JsonIgnore]
    public required string Password { get; set; }
    
    [Required]
    [JsonPropertyName("id")]
    public required int Id { get; set; }

    // Internal revocation marker, never exposed to clients
    [JsonIgnore]
    public Guid SecurityStamp { get; set; }
}