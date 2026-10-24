namespace backend.MessagingComponent.Logic.Types;

/// <summary>
/// Counts one requester's misses on tokens that are not online.
/// The miss that fills the budget locks it, for twice as long as the lock before, up to <see cref="MaxLockDuration"/>.
/// Not thread-safe.
/// </summary>
public class UnknownTokenBudget
{
    public const int MissesPerWindow = 5;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(1);
    public static readonly TimeSpan FirstLockDuration = TimeSpan.FromMinutes(1);
    public static readonly TimeSpan MaxLockDuration = TimeSpan.FromMinutes(15);

    // Time after the end of the last lock that starts the doubling over from FirstLockDuration.
    public static readonly TimeSpan LockCountResetAfter = TimeSpan.FromMinutes(15);

    private readonly SlidingWindowCounter _misses = new(Window);
    private DateTimeOffset? _lockedUntil;
    private int _lockCount;

    /// <summary>
    /// Returns the time until the lock ends, or null if the budget is not locked.
    /// </summary>
    public TimeSpan? LockRemaining(DateTimeOffset now)
    {
        return _lockedUntil > now ? _lockedUntil - now : null;
    }

    /// <summary>
    /// Counts a miss. A miss while locked counts nothing.
    /// </summary>
    public void RecordMiss(DateTimeOffset now)
    {
        if (LockRemaining(now) != null)
            return;

        _misses.Add(now);
        if (_misses.Count(now) < MissesPerWindow)
            return;

        if (_lockedUntil != null && now - _lockedUntil >= LockCountResetAfter)
            _lockCount = 0;

        _lockedUntil = now + NextLockDuration();
        _lockCount++;
        _misses.Clear();
    }

    /// <summary>
    /// Returns true if the budget holds no miss, no lock and no lock count, so dropping it changes nothing.
    /// </summary>
    public bool IsExpired(DateTimeOffset now)
    {
        return _misses.Count(now) == 0
            && (_lockedUntil == null || now - _lockedUntil >= LockCountResetAfter);
    }

    private TimeSpan NextLockDuration()
    {
        var duration = FirstLockDuration;
        for (var i = 0; i < _lockCount && duration < MaxLockDuration; i++)
        {
            duration *= 2;
        }

        return duration < MaxLockDuration ? duration : MaxLockDuration;
    }
}
