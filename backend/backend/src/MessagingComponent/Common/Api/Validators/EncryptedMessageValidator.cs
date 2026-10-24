namespace backend.MessagingComponent.Common.Api.Validators;

public class EncryptedMessageValidator
{
    public const int MaxIdLength = 64;
    public const int IvBytes = 12;
    public const int MaxPublicKeyLength = 200;

    // Base64 of 1 MiB plaintext plus the 16-byte AES-GCM tag.
    public const int MaxTextCiphertextChars = (1024 * 1024 + 16 + 2) / 3 * 4;
    public const int MaxOfferCiphertextChars = 16 * 1024;

    public static bool IsValidId(string? id) => !string.IsNullOrEmpty(id) && id.Length <= MaxIdLength;

    public static bool IsValidIv(string? iv) => iv != null && DecodedLength(iv) == IvBytes;

    public static bool IsValidPublicKey(string? key) =>
        !string.IsNullOrEmpty(key) && key.Length <= MaxPublicKeyLength && DecodedLength(key) != null;

    /// <summary>
    /// Returns the number of bytes the base64 string decodes to, or null if it is not valid base64.
    /// </summary>
    private static int? DecodedLength(string base64)
    {
        var bytes = new byte[base64.Length / 4 * 3];

        return Convert.TryFromBase64String(base64, bytes, out var written) ? written : null;
    }
}
