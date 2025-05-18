using System.Security.Cryptography;
using System.Text;
using backend.AccountCompoment.Common.DTOs;
using backend.AccountCompoment.Common.Exception;

namespace backend.AccountCompoment.Dataaccess.Api.Entity;

public class Account
{
    private readonly string _displayName;
    private readonly string _password;
    private byte[]? _salt;
    
    // vielleicht auch statt displayname die email angeben können..
    public Account(string displayName, string password)
    {
        if (displayName == null || password == null)
        {
            throw new ArgumentException("Please provide both displayName and password");
        }
        _displayName = displayName;
        
        // salt is global variable because it needs to be stored in the database
        _salt = GenerateSalt();
        _password = EncryptPassword(password, _salt);
    }

    public string GetName() {
        return _displayName;
    }

    public string GetPassword() {
        return _password;
    }

    public byte[] GetSalt()
    {
        return _salt;
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
    /**
     * Hash und Salt des Passwortes.
     */
    private string EncryptPassword(string password, byte[] salt)
    {
        // Combine password and salt
        byte[] passwordBytes = Encoding.UTF8.GetBytes(password);
        byte[] saltedPassword = new byte[passwordBytes.Length + salt.Length];
        Buffer.BlockCopy(passwordBytes, 0, saltedPassword, 0, passwordBytes.Length);
        Buffer.BlockCopy(salt, 0, saltedPassword, passwordBytes.Length, salt.Length);

        // Hash the salted password
        using SHA256 sha256 = SHA256.Create();
        byte[] hashBytes = sha256.ComputeHash(saltedPassword);

        // Combine the salt and hash (salt comes first)
        byte[] hashWithSalt = new byte[hashBytes.Length + salt.Length];
        Buffer.BlockCopy(salt, 0, hashWithSalt, 0, salt.Length);
        Buffer.BlockCopy(hashBytes, 0, hashWithSalt, salt.Length, hashBytes.Length);
        
        // Convert to base64 for easy storage or transmission
        return Convert.ToBase64String(hashWithSalt);
    }
    
    // Method to generate a secure random salt
    private static byte[] GenerateSalt()
    {
        using var rng = RandomNumberGenerator.Create();
        byte[] salt = new byte[16]; // Salt size (16 bytes is a good default)
        rng.GetBytes(salt);
        return salt;
    }

    public static bool VerifyPassword(string inputPassword, string storedPasswordBase64)
    {
        // Decode the stored salt+hash
        byte[] storedHashWithSalt = Convert.FromBase64String(storedPasswordBase64);

        // SHA256 hash size = 32 bytes (256 bits)
        const int hashSize = 32;
        if (storedHashWithSalt.Length < hashSize)
            return false;

        // Extract salt and hash from stored value
        int saltLength = storedHashWithSalt.Length - hashSize;
        byte[] salt = new byte[saltLength];
        byte[] storedHash = new byte[hashSize];
        Buffer.BlockCopy(storedHashWithSalt, 0, salt, 0, saltLength);
        Buffer.BlockCopy(storedHashWithSalt, saltLength, storedHash, 0, hashSize);

        // Hash the input password with the extracted salt
        byte[] inputPasswordBytes = Encoding.UTF8.GetBytes(inputPassword);
        byte[] saltedInputPassword = new byte[inputPasswordBytes.Length + salt.Length];
        Buffer.BlockCopy(inputPasswordBytes, 0, saltedInputPassword, 0, inputPasswordBytes.Length);
        Buffer.BlockCopy(salt, 0, saltedInputPassword, inputPasswordBytes.Length, salt.Length);

        using SHA256 sha256 = SHA256.Create();
        byte[] inputHash = sha256.ComputeHash(saltedInputPassword);

        // Use constant-time comparison
        return CryptographicOperations.FixedTimeEquals(inputHash, storedHash);
    }
}