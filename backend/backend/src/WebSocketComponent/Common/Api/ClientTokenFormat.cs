namespace backend.WebSocketComponent.Common.Api;

/// <summary>
/// Letters and length of a client token.
/// A generated token follows the proquint pattern con-vo-con-vo-con.
/// A requested token takes any of the letters a-z and digits 0-9.
/// </summary>
public static class ClientTokenFormat
{
    public const int Length = 5;
    public const string ProquintConsonants = "bdfghjklmnprstvz"; // 4 bits
    public const string ProquintVowels = "aiou"; // 2 bits

    /// <summary>
    /// Returns true if the token has <see cref="Length"/> characters from lowercase a-z and 0-9, false otherwise.
    /// </summary>
    public static bool IsValidRequestedToken(string token)
    {
        return token.Length == Length && token.All(c => char.IsAsciiLetterLower(c) || char.IsAsciiDigit(c));
    }
}
