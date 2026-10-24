namespace backend.MessagingComponent.Logic.Types;

/// <summary>
/// Counts events within the last <paramref name="window"/>. Not thread-safe.
/// </summary>
public class SlidingWindowCounter(TimeSpan window)
{
    // Oldest first.
    private readonly Queue<DateTimeOffset> _events = new();

    public void Add(DateTimeOffset now)
    {
        _events.Enqueue(now);
    }

    public int Count(DateTimeOffset now)
    {
        Prune(now);
        return _events.Count;
    }

    public void Clear()
    {
        _events.Clear();
    }

    /// <summary>
    /// Returns the time until fewer than <paramref name="limit"/> events remain in the window, zero if they already do.
    /// </summary>
    public TimeSpan UntilBelow(int limit, DateTimeOffset now)
    {
        Prune(now);

        if (_events.Count < limit)
            return TimeSpan.Zero;

        return _events.ElementAt(_events.Count - limit) + window - now;
    }

    private void Prune(DateTimeOffset now)
    {
        while (_events.Count > 0 && _events.Peek() + window <= now)
        {
            _events.Dequeue();
        }
    }
}
