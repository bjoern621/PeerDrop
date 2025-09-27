using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using backend.ConnectionComponent.Dataaccess.Api;

namespace backend.ConnectionComponent.Dataaccess.Impl;

public class OpenConnectionRequestRepository : IOpenConnectionRequestRepository
{
    private readonly ConcurrentDictionary<string, string> _openRequests = new();

    public void Add(string requesterToken, string targetToken)
    {
        _openRequests[requesterToken] = targetToken;
    }

    public bool TryRemove(string requesterToken, [MaybeNullWhen(false)] out string targetToken)
    {
        return _openRequests.TryRemove(requesterToken, out targetToken);
    }

    public bool IsClientBusy(string clientToken)
    {
        // A client is busy if they are making a request (a key) or are the target of a request (a value).
        return _openRequests.ContainsKey(clientToken) || _openRequests.Values.Contains(clientToken);
    }

    public IEnumerable<string> FindAndRemoveRequestersForTarget(string targetToken)
    {
        var requesters = _openRequests
            .Where(kv => kv.Value == targetToken)
            .Select(kv => kv.Key)
            .ToList();

        foreach (var requester in requesters)
        {
            _openRequests.TryRemove(requester, out _);
        }

        return requesters;
    }
}
