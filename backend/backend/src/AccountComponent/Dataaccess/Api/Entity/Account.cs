using backend.AccountComponent.Common.DTOs;

namespace backend.AccountComponent.Dataaccess.Api.Entity;

public class Account
{
    private readonly string _displayName;
    private readonly string _password;
    
    // vielleicht auch statt displayname die email angeben können..
    public Account(string displayName, string hashedPassword)
    {
        if (displayName == null || hashedPassword == null)
        {
            throw new ArgumentException("Please provide both displayName and password");
        }
        _displayName = displayName;
        _password = hashedPassword;
    }

    public string GetName() {
        return _displayName;
    }

    public string GetPassword() {
        return _password;
    }
    
    public static Account Of(AccountCreateDto accountCreateDto) {
        return new Account(
            accountCreateDto.DisplayName,
            accountCreateDto.Password  // is in its hashed Form already! (or rather, should be passed in that form !)
        );
    }
    
}