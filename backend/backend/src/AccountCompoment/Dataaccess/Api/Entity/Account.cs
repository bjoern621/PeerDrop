using System.Security.Cryptography;
using System.Text;
using backend.AccountCompoment.Common.DTOs;
using backend.AccountCompoment.Common.Exception;
using Microsoft.AspNetCore.Identity;

namespace backend.AccountCompoment.Dataaccess.Api.Entity;

public class Account
{
    private readonly string _displayName;
    private readonly string _password;
    
    // vielleicht auch statt displayname die email angeben können..
    public Account(string displayName, string password)
    {
        if (displayName == null || password == null)
        {
            throw new ArgumentException("Please provide both displayName and password");
        }
        _displayName = displayName;
        
        _password = EncryptPassword(password);
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
            accountCreateDto.Password
        );
    }
    
    public static void ValidatePasswordFormat(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 6 || password.Contains(' '))
        {
            throw new InvalidPasswordFormatException("Password must be at least 6 characters long and contain no whitespace.");
        }
    }
    
    public static void ValidateUsernameFormat(string username)
    {
        if (string.IsNullOrWhiteSpace(username) || username.Length < 3 || username.Contains(' '))
        {
            throw new InvalidUsernameFormatException("Username must be at least 3 characters long and contain no whitespace.");
        }
    }
    
    // Method to encrypt a password
    private string EncryptPassword(string password)
    {
        PasswordHasher hasher = new PasswordHasher();
        return hasher.HashPassword(password);
    }
    
    public static bool VerifyPassword(string inputPassword, string storedPassword)
    {
        PasswordHasher hasher = new PasswordHasher();
        return hasher.VerifyPassword(inputPassword, storedPassword);
    }
    
}