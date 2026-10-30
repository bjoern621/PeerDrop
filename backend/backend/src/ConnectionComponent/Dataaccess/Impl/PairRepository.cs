using backend.ConnectionComponent.Dataaccess.Api;

namespace backend.ConnectionComponent.Dataaccess.Impl;

public class PairRepository : IPairRepository
{
    // Lowercase tokens.
    private readonly HashSet<(string Sender, string Receiver)> _permissions = [];

    // Unordered pairs of lowercase tokens, the ordinally smaller token first.
    private readonly HashSet<(string, string)> _connectedPairs = [];

    // Lowercase tokens.
    private readonly HashSet<(string Claimant, string Partner)> _resumeClaims = [];

    private readonly Lock _lock = new();

    public void AddPermission(string senderToken, string receiverToken)
    {
        lock (_lock)
        {
            _permissions.Add((Normalize(senderToken), Normalize(receiverToken)));
        }
    }

    public bool HasPermissionEitherWay(string clientTokenA, string clientTokenB)
    {
        var a = Normalize(clientTokenA);
        var b = Normalize(clientTokenB);

        lock (_lock)
        {
            return _permissions.Contains((a, b)) || _permissions.Contains((b, a));
        }
    }

    public bool TryAddConnectedPair(string clientTokenA, string clientTokenB)
    {
        lock (_lock)
        {
            return _connectedPairs.Add(UnorderedPair(clientTokenA, clientTokenB));
        }
    }

    public bool TryRemoveConnectedPair(string clientTokenA, string clientTokenB)
    {
        lock (_lock)
        {
            return _connectedPairs.Remove(UnorderedPair(clientTokenA, clientTokenB));
        }
    }

    public bool AreConnected(string clientTokenA, string clientTokenB)
    {
        lock (_lock)
        {
            return _connectedPairs.Contains(UnorderedPair(clientTokenA, clientTokenB));
        }
    }

    public ResumeClaim ClaimResume(string claimantToken, string partnerToken)
    {
        var claimant = Normalize(claimantToken);
        var partner = Normalize(partnerToken);

        lock (_lock)
        {
            if (!_resumeClaims.Remove((partner, claimant)))
                return _resumeClaims.Add((claimant, partner)) ? ResumeClaim.Recorded : ResumeClaim.Repeated;

            _connectedPairs.Add(UnorderedPair(claimant, partner));
            return ResumeClaim.Connected;
        }
    }

    public IReadOnlyList<string> RemoveClient(string clientToken)
    {
        var token = Normalize(clientToken);

        lock (_lock)
        {
            _permissions.RemoveWhere(permission => permission.Sender == token || permission.Receiver == token);
            _resumeClaims.RemoveWhere(claim => claim.Claimant == token || claim.Partner == token);

            var partners = _connectedPairs
                .Where(pair => pair.Item1 == token || pair.Item2 == token)
                .Select(pair => pair.Item1 == token ? pair.Item2 : pair.Item1)
                .ToList();

            _connectedPairs.RemoveWhere(pair => pair.Item1 == token || pair.Item2 == token);

            return partners;
        }
    }

    private static string Normalize(string clientToken) => clientToken.ToLowerInvariant();

    private static (string, string) UnorderedPair(string clientTokenA, string clientTokenB)
    {
        var a = Normalize(clientTokenA);
        var b = Normalize(clientTokenB);

        return string.CompareOrdinal(a, b) <= 0 ? (a, b) : (b, a);
    }
}
