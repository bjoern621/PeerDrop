using Microsoft.AspNetCore.Http;

namespace backend.tests.TestUtils;

public class SessionSetup : ISession
{
    private readonly Dictionary<string, byte[]> _sessionStorage = new();

    public IEnumerable<string> Keys => _sessionStorage.Keys;
    public string Id => Guid.NewGuid().ToString();
    public bool IsAvailable => true;

    public void Clear() => _sessionStorage.Clear();

    public Task CommitAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task LoadAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

    public void Remove(string key) => _sessionStorage.Remove(key);

    public void Set(string key, byte[] value) => _sessionStorage[key] = value;

    public bool TryGetValue(string key, out byte[] value)
    {
        if (_sessionStorage.TryGetValue(key, out var temp))
        {
            value = temp;
            return true;
        }

        value = [];
        return false;
    }
}