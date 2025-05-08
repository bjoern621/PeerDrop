using System.Security.Cryptography;
using System.Text;

namespace backend;

public class Account
{
    private string _displayName;
    private string _password;
    
    // vielleicht auch statt displayname die email angeben können..
    public Account(string displayName, string password)
    {
        if (displayName == null || password == null)
        {
            throw new ArgumentException("Please provide both displayName and password");
        }
        _displayName = displayName;
        _password = encryptPassword(password);
    }

    public string getName() {
        return _displayName;
    }

    public string getPassword() {
        return _password;
    }
    
    public static Account of(AccountCreateDTO accountCreateDto) {
        return new Account(
            accountCreateDto.getDisplayName(),
            accountCreateDto.getPassword()
        );
    }

    /**
     * Hash und Salt des Passwortes.
     */
    private string encryptPassword(string password)
    {
        // Generate a random salt
        byte[] salt = GenerateSalt();

        // Combine password and salt
        byte[] passwordBytes = Encoding.UTF8.GetBytes(password);
        byte[] saltedPassword = new byte[passwordBytes.Length + salt.Length];
        Buffer.BlockCopy(passwordBytes, 0, saltedPassword, 0, passwordBytes.Length);
        Buffer.BlockCopy(salt, 0, saltedPassword, passwordBytes.Length, salt.Length);

        // Hash the salted password
        using (SHA256 sha256 = SHA256.Create())
        {
            byte[] hashBytes = sha256.ComputeHash(saltedPassword);

            // Combine the salt and hash (salt comes first)
            byte[] hashWithSalt = new byte[hashBytes.Length + salt.Length];
            Buffer.BlockCopy(salt, 0, hashWithSalt, 0, salt.Length);
            Buffer.BlockCopy(hashBytes, 0, hashWithSalt, salt.Length, hashBytes.Length);

            // Convert to base64 for easy storage or transmission
            return Convert.ToBase64String(hashWithSalt);
        }
    }
    
    // Method to generate a secure random salt
    private static byte[] GenerateSalt()
    {
        using (RNGCryptoServiceProvider rng = new RNGCryptoServiceProvider())
        {
            byte[] salt = new byte[16]; // Salt size (16 bytes is a good default)
            rng.GetBytes(salt);
            return salt;
        }
    }

    // Method to verify password
    public static bool VerifyPassword(string inputPassword, string storedPassword)
    {
        // Convert the stored password from base64 to bytes
        byte[] storedPasswordBytes = Convert.FromBase64String(storedPassword);

        // Extract the salt (first 16 bytes)
        byte[] salt = new byte[16];
        Buffer.BlockCopy(storedPasswordBytes, 0, salt, 0, salt.Length);

        // Combine input password with the salt
        byte[] inputPasswordBytes = Encoding.UTF8.GetBytes(inputPassword);
        byte[] saltedInputPassword = new byte[inputPasswordBytes.Length + salt.Length];
        Buffer.BlockCopy(inputPasswordBytes, 0, saltedInputPassword, 0, inputPasswordBytes.Length);
        Buffer.BlockCopy(salt, 0, saltedInputPassword, inputPasswordBytes.Length, salt.Length);

        // Hash the salted input password
        using (SHA256 sha256 = SHA256.Create())
        {
            byte[] inputPasswordHash = sha256.ComputeHash(saltedInputPassword);

            // Compare the hashes (excluding the salt part)
            for (int i = 0; i < inputPasswordHash.Length; i++)
            {
                if (inputPasswordHash[i] != storedPasswordBytes[i + salt.Length])
                {
                    return false;
                }
            }
        }

        return true;
    }
}