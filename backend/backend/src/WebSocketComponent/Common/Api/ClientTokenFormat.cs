namespace backend.WebSocketComponent.Common.Api;

/// <summary>
/// Letters and length of a client token.
/// A generated token follows the proquint pattern con-vo-con-vo-con.
/// A chosen token takes the same letters in any order.
/// </summary>
public static class ClientTokenFormat
{
    public const int Length = 5;
    public const string ProquintConsonants = "bdfghjklmnprstvz"; // 4 bits
    public const string ProquintVowels = "aiou"; // 2 bits

    /// <summary>
    /// Returns true if the token has <see cref="Length"/> lowercase proquint letters, false otherwise.
    /// </summary>
    public static bool IsValidChosenToken(string token)
    {
        return token.Length == Length
            && token.All(c => ProquintConsonants.Contains(c) || ProquintVowels.Contains(c));
    }
}
