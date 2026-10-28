namespace backend.MessagingComponent.Dataaccess.Api;

/// <summary>
/// Holds the token that each client looked up last, so the client learns when that token leaves or returns.
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
    /// Drops the watcher's watch. Nothing happens if it watches no token.
    /// </summary>
    void Unwatch(string watcherToken);

    /// <summary>
    /// Returns the clients that watch the token.
    /// </summary>
    IReadOnlyList<string> WatchersOf(string watchedToken);

    /// <summary>
    /// Drops the client's own watch and returns the clients that watch it.
    /// Those clients keep watching, so they learn when the token returns.
    /// </summary>
    IReadOnlyList<string> RemoveClient(string clientToken);
}
