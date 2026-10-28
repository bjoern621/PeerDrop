namespace backend.MessagingComponent.Dataaccess.Api;

/// <summary>
/// Holds the public key that each client announced last. Tokens compare case-insensitively.
/// Can be called concurrently.
/// </summary>
public interface IPublicKeyRepository
{
    /// <summary>
    /// Replaces the key that the client announced before.
    /// </summary>
    void Set(string clientToken, string publicKey);

    /// <summary>
    /// Returns null if the client announced no key.
    /// </summary>
    string? Get(string clientToken);

    /// <summary>
    /// Nothing happens if the client announced no key.
    /// </summary>
    void Remove(string clientToken);
}
