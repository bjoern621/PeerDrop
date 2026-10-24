namespace backend.MessagingComponent.Logic.Types;

/// <summary>
/// Holds up to <paramref name="capacity"/> tokens and gains one per <paramref name="refillInterval"/>.
/// Starts full. Not thread-safe.
/// </summary>
public class TokenBucket(int capacity, TimeSpan refillInterval, DateTimeOffset now)
{
    // Fractional, so a partial refill interval is kept.
    private double _tokens = capacity;
    private DateTimeOffset _refilledAt = now;

    /// <summary>
    /// Returns the time until the bucket holds a whole token, or null if it does.
    /// </summary>
    public TimeSpan? WaitForToken(DateTimeOffset now)
    {
        Refill(now);
        return _tokens >= 1 ? null : refillInterval * (1 - _tokens);
    }

    /// <summary>
    /// Takes one token. An empty bucket stays empty.
    /// </summary>
    public void Take(DateTimeOffset now)
    {
        Refill(now);
        _tokens = Math.Max(0, _tokens - 1);
    }

    private void Refill(DateTimeOffset now)
    {
        _tokens = Math.Min(capacity, _tokens + (now - _refilledAt) / refillInterval);
        _refilledAt = now;
    }
}
