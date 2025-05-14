using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace backend;

public class AccountCreateDto
{
    [Required]
    [StringLength(100, MinimumLength = 3)]
    [JsonPropertyName("username")]
    public required string DisplayName { get; set; }
    
    [Required]
    [StringLength(100, MinimumLength = 6)]
    [JsonPropertyName("password")]
    public required string Password { get; set; }
}