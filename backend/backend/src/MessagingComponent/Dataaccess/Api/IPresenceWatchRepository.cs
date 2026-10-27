namespace backend.MessagingComponent.Dataaccess.Api;

/// <summary>
/// Holds the online token that each client looked up last, so the client learns when that token leaves.
/// Tokens compare case-insensitively.
/// Can be called concurrently.
/// </summary>
public interface IPresenceWatchRepository
{
    /// <summary>
    /// Replaces the token that the watcher watched before.
    /// </summary>
    void Watch(string watcherToken, string watchedToken);

    /// <summary>
    /// Drops the client's own watch and returns the clients that watched it.
    /// Those clients watch nothing afterwards.
    /// </summary>
    IReadOnlyList<string> RemoveClient(string clientToken);
}
