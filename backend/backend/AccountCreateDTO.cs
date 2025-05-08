using System.ComponentModel.DataAnnotations;

namespace backend;

public class AccountCreateDto()
{
    [Required]
    [StringLength(100, MinimumLength = 3)]
    public string DisplayName {get; set; }
    
    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string Password {get; set; }
}