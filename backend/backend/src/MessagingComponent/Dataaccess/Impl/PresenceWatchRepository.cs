using backend.MessagingComponent.Dataaccess.Api;

namespace backend.MessagingComponent.Dataaccess.Impl;

public class PresenceWatchRepository : IPresenceWatchRepository
{
    private readonly Dictionary<string, string> _watchedBy = [];
    private readonly Lock _lock = new();

    public void Watch(string watcherToken, string watchedToken)
    {
        lock (_lock)
        {
            _watchedBy[Normalize(watcherToken)] = Normalize(watchedToken);
        }
    }

    public IReadOnlyList<string> RemoveClient(string clientToken)
    {
        var token = Normalize(clientToken);

        lock (_lock)
        {
            _watchedBy.Remove(token);
            var watchers = _watchedBy.Where(w => w.Value == token).Select(w => w.Key).ToList();
            watchers.ForEach(watcher => _watchedBy.Remove(watcher));
            return watchers;
        }
    }

    private static string Normalize(string token) => token.ToLowerInvariant();
}
