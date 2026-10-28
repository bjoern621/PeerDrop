using System.Collections.Concurrent;
using backend.MessagingComponent.Dataaccess.Api;

namespace backend.MessagingComponent.Dataaccess.Impl;

public class PublicKeyRepository : IPublicKeyRepository
{
    private readonly ConcurrentDictionary<string, string> _keys = new(StringComparer.OrdinalIgnoreCase);

    public void Set(string clientToken, string publicKey) => _keys[clientToken] = publicKey;

    public string? Get(string clientToken) => _keys.GetValueOrDefault(clientToken);

    public void Remove(string clientToken) => _keys.TryRemove(clientToken, out _);
}
