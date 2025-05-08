using System.ComponentModel.DataAnnotations;

namespace backend;

public class AccountCreateDTO
{
    [Required]
    [StringLength(100, MinimumLength = 3)]
    private string _displayName;
    
    [Required]
    [StringLength(100, MinimumLength = 6)]
    private string _password;

    public AccountCreateDTO(string displayName, string password)
    {
        _displayName = displayName;
        _password = password;
    }
    
    public string getDisplayName() {
        return _displayName;
    }
    
    public string getPassword() {
        return _password;
    }
}