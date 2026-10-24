using backend.MessagingComponent.Logic.Api;
using backend.MessagingComponent.Logic.Types;

namespace backend.MessagingComponent.Logic.Impl;

public class AbuseGuard(TimeProvider timeProvider) : IAbuseGuard
{
    public const int TextBucketCapacity = 5;
    public static readonly TimeSpan TextRefillInterval = TimeSpan.FromSeconds(6);
    public const int ReceiverTextsPerWindow = 30;
    public const int OffersPerWindow = 30;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    private readonly Dictionary<string, UnknownTokenBudget> _tokenBudgets = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, UnknownTokenBudget> _ipBudgets = new();
    private readonly Dictionary<string, TokenBucket> _textBuckets = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, SlidingWindowCounter> _receiverTexts = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, SlidingWindowCounter> _offers = new(StringComparer.OrdinalIgnoreCase);

    private DateTimeOffset _ipBudgetsSweptAt = DateTimeOffset.MinValue;

    private readonly Lock _lock = new();

    public TimeSpan? GetUnknownTokenLock(string requesterToken, string? requesterIp)
    {
        var now = timeProvider.GetUtcNow();

        lock (_lock)
        {
            return LongerLock(
                _tokenBudgets.GetValueOrDefault(requesterToken)?.LockRemaining(now),
                requesterIp == null ? null : _ipBudgets.GetValueOrDefault(requesterIp)?.LockRemaining(now));
        }
    }

    public TimeSpan? RecordUnknownTokenMiss(string requesterToken, string? requesterIp)
    {
        var now = timeProvider.GetUtcNow();

        lock (_lock)
        {
            SweepExpiredIpBudgets(now);

            var tokenBudget = GetOrAdd(_tokenBudgets, requesterToken, () => new UnknownTokenBudget());
            tokenBudget.RecordMiss(now);

            if (requesterIp == null)
                return tokenBudget.LockRemaining(now);

            var ipBudget = GetOrAdd(_ipBudgets, requesterIp, () => new UnknownTokenBudget());
            ipBudget.RecordMiss(now);

            return LongerLock(tokenBudget.LockRemaining(now), ipBudget.LockRemaining(now));
        }
    }

    public TimeSpan? GetTextWait(string senderToken)
    {
        var now = timeProvider.GetUtcNow();

        lock (_lock)
        {
            return _textBuckets.GetValueOrDefault(senderToken)?.WaitForToken(now);
        }
    }

    public bool IsReceiverTextCapReached(string receiverToken)
    {
        var now = timeProvider.GetUtcNow();

        lock (_lock)
        {
            return _receiverTexts.TryGetValue(receiverToken, out var texts)
                && texts.Count(now) >= ReceiverTextsPerWindow;
        }
    }

    public void RecordTextDelivered(string senderToken, string receiverToken)
    {
        var now = timeProvider.GetUtcNow();

        lock (_lock)
        {
            GetOrAdd(_textBuckets, senderToken, () => new TokenBucket(TextBucketCapacity, TextRefillInterval, now)).Take(now);
            GetOrAdd(_receiverTexts, receiverToken, () => new SlidingWindowCounter(Window)).Add(now);
        }
    }

    public TimeSpan? TryRecordOffer(string senderToken)
    {
        var now = timeProvider.GetUtcNow();

        lock (_lock)
        {
            var offers = GetOrAdd(_offers, senderToken, () => new SlidingWindowCounter(Window));

            var wait = offers.UntilBelow(OffersPerWindow, now);
            if (wait > TimeSpan.Zero)
                return wait;

            offers.Add(now);
            return null;
        }
    }

    public void ForgetToken(string clientToken)
    {
        lock (_lock)
        {
            _tokenBudgets.Remove(clientToken);
            _textBuckets.Remove(clientToken);
            _receiverTexts.Remove(clientToken);
            _offers.Remove(clientToken);
        }
    }

    /// <summary>
    /// Drops IP budgets that hold nothing, at most once per window. Must be called under _lock.
    /// </summary>
    private void SweepExpiredIpBudgets(DateTimeOffset now)
    {
        if (now - _ipBudgetsSweptAt < Window)
            return;

        foreach (var (ip, budget) in _ipBudgets.ToList())
        {
            if (budget.IsExpired(now))
                _ipBudgets.Remove(ip);
        }

        _ipBudgetsSweptAt = now;
    }

    private static TValue GetOrAdd<TValue>(Dictionary<string, TValue> dictionary, string key, Func<TValue> create)
    {
        if (!dictionary.TryGetValue(key, out var value))
        {
            value = create();
            dictionary[key] = value;
        }

        return value;
    }

    private static TimeSpan? LongerLock(TimeSpan? a, TimeSpan? b)
    {
        if (a == null)
            return b;
        if (b == null)
            return a;

        return a > b ? a : b;
    }
}
