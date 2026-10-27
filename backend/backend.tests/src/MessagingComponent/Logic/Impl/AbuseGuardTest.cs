using backend.MessagingComponent.Logic.Impl;
using backend.tests.TestUtils;

namespace backend.tests.MessagingComponent.Logic.Impl;

[Category("UnitTest")]
public class AbuseGuardTest
{
    private const string TOKEN_A = "sabak";
    private const string TOKEN_B = "rinot";
    private const string IP = "203.0.113.7";

    private ManualTimeProvider _clock;
    private AbuseGuard _guard;

    [SetUp]
    public void Setup()
    {
        _clock = new ManualTimeProvider();
        _guard = new AbuseGuard(_clock);
    }

    private TimeSpan? MissTimes(int misses, string token = TOKEN_A, string? ip = IP)
    {
        TimeSpan? lockRemaining = null;
        for (var i = 0; i < misses; i++)
        {
            lockRemaining = _guard.RecordUnknownTokenMiss(token, ip);
        }

        return lockRemaining;
    }

    [Test]
    public void RecordUnknownTokenMiss_FiveMisses_LeavesBudgetUnlocked()
    {
        Assert.Multiple(() =>
        {
            Assert.That(MissTimes(5), Is.Null);
            Assert.That(_guard.GetUnknownTokenLock(TOKEN_A, IP), Is.Null);
        });
    }

    [Test]
    public void RecordUnknownTokenMiss_SixthMiss_LocksForOneMinute()
    {
        Assert.Multiple(() =>
        {
            Assert.That(MissTimes(6), Is.EqualTo(TimeSpan.FromMinutes(1)));
            Assert.That(_guard.GetUnknownTokenLock(TOKEN_A, IP), Is.EqualTo(TimeSpan.FromMinutes(1)));
        });
    }

    [Test]
    public void GetUnknownTokenLock_AfterLockDuration_ReturnsNull()
    {
        MissTimes(6);

        _clock.Advance(TimeSpan.FromMinutes(1));

        Assert.That(_guard.GetUnknownTokenLock(TOKEN_A, IP), Is.Null);
    }

    [Test]
    public void RecordUnknownTokenMiss_MissesOutsideWindow_DoNotCount()
    {
        MissTimes(5);
        _clock.Advance(TimeSpan.FromSeconds(61));

        Assert.That(MissTimes(1), Is.Null);
    }

    [Test]
    public void RecordUnknownTokenMiss_RepeatedLocks_DoubleUpToFifteenMinutes()
    {
        var lockMinutes = new List<double>();
        for (var i = 0; i < 6; i++)
        {
            var lockRemaining = MissTimes(6)!.Value;
            lockMinutes.Add(lockRemaining.TotalMinutes);
            _clock.Advance(lockRemaining);
        }

        Assert.That(lockMinutes, Is.EqualTo(new[] { 1, 2, 4, 8, 15, 15 }));
    }

    [Test]
    public void RecordUnknownTokenMiss_FifteenMinutesWithoutLock_StartsDoublingOver()
    {
        _clock.Advance(MissTimes(6)!.Value);
        _clock.Advance(MissTimes(6)!.Value);

        _clock.Advance(TimeSpan.FromMinutes(15));

        Assert.That(MissTimes(6), Is.EqualTo(TimeSpan.FromMinutes(1)));
    }

    [Test]
    public void RecordUnknownTokenMiss_MissesWhileLocked_DoNotExtendLock()
    {
        MissTimes(6);
        _clock.Advance(TimeSpan.FromSeconds(30));

        Assert.That(MissTimes(3), Is.EqualTo(TimeSpan.FromSeconds(30)));
    }

    [Test]
    public void RecordUnknownTokenMiss_MissesFromTwoTokensOnOneIp_LockTheIp()
    {
        MissTimes(3, TOKEN_A);
        MissTimes(3, TOKEN_B);

        Assert.Multiple(() =>
        {
            Assert.That(_guard.GetUnknownTokenLock(TOKEN_A, IP), Is.EqualTo(TimeSpan.FromMinutes(1)));
            Assert.That(_guard.GetUnknownTokenLock("lukid", IP), Is.EqualTo(TimeSpan.FromMinutes(1)));
            Assert.That(_guard.GetUnknownTokenLock(TOKEN_A, "198.51.100.1"), Is.Null);
        });
    }

    [Test]
    public void RecordUnknownTokenMiss_WithoutIp_LocksToken()
    {
        Assert.That(MissTimes(6, TOKEN_A, null), Is.EqualTo(TimeSpan.FromMinutes(1)));
    }

    [Test]
    public void ForgetToken_DropsTokenBudgetAndKeepsIpBudget()
    {
        MissTimes(6);

        _guard.ForgetToken(TOKEN_A);

        Assert.Multiple(() =>
        {
            Assert.That(_guard.GetUnknownTokenLock(TOKEN_A, null), Is.Null);
            Assert.That(_guard.GetUnknownTokenLock(TOKEN_A, IP), Is.EqualTo(TimeSpan.FromMinutes(1)));
        });
    }

    [Test]
    public void GetTextWait_AfterFiveTexts_WaitsOneRefillInterval()
    {
        for (var i = 0; i < 5; i++)
        {
            Assert.That(_guard.GetTextWait(TOKEN_A), Is.Null, $"text {i + 1}");
            _guard.RecordTextDelivered(TOKEN_A, TOKEN_B);
        }

        Assert.That(_guard.GetTextWait(TOKEN_A), Is.EqualTo(TimeSpan.FromSeconds(6)));
    }

    [Test]
    public void GetTextWait_EmptyBucket_RefillsOneTokenPerSixSeconds()
    {
        for (var i = 0; i < 5; i++)
        {
            _guard.RecordTextDelivered(TOKEN_A, TOKEN_B);
        }

        _clock.Advance(TimeSpan.FromSeconds(4));
        Assert.That(_guard.GetTextWait(TOKEN_A), Is.EqualTo(TimeSpan.FromSeconds(2)));

        _clock.Advance(TimeSpan.FromSeconds(2));
        Assert.That(_guard.GetTextWait(TOKEN_A), Is.Null);

        _guard.RecordTextDelivered(TOKEN_A, TOKEN_B);
        Assert.That(_guard.GetTextWait(TOKEN_A), Is.EqualTo(TimeSpan.FromSeconds(6)));
    }

    [Test]
    public void GetTextWait_LongIdle_RefillsToCapacityOnly()
    {
        _guard.RecordTextDelivered(TOKEN_A, TOKEN_B);
        _clock.Advance(TimeSpan.FromHours(1));

        for (var i = 0; i < 5; i++)
        {
            _guard.RecordTextDelivered(TOKEN_A, TOKEN_B);
        }

        Assert.That(_guard.GetTextWait(TOKEN_A), Is.Not.Null);
    }

    [Test]
    public void IsReceiverTextCapReached_ThirtyTextsFromSeveralSenders_ReturnsTrueUntilWindowPasses()
    {
        for (var i = 0; i < 30; i++)
        {
            Assert.That(_guard.IsReceiverTextCapReached(TOKEN_B), Is.False, $"text {i + 1}");
            _guard.RecordTextDelivered($"s{i}", TOKEN_B);
        }

        Assert.That(_guard.IsReceiverTextCapReached(TOKEN_B), Is.True);

        _clock.Advance(TimeSpan.FromMinutes(1));

        Assert.That(_guard.IsReceiverTextCapReached(TOKEN_B), Is.False);
    }

    [Test]
    public void TryRecordOffer_ThirtyFirstOfferWithinWindow_ReturnsWaitAndCountsNothing()
    {
        for (var i = 0; i < 30; i++)
        {
            Assert.That(_guard.TryRecordOffer(TOKEN_A), Is.Null, $"offer {i + 1}");
            _clock.Advance(TimeSpan.FromSeconds(1));
        }

        Assert.That(_guard.TryRecordOffer(TOKEN_A), Is.EqualTo(TimeSpan.FromSeconds(30)));

        _clock.Advance(TimeSpan.FromSeconds(30));

        Assert.Multiple(() =>
        {
            Assert.That(_guard.TryRecordOffer(TOKEN_A), Is.Null);
            Assert.That(_guard.TryRecordOffer(TOKEN_A), Is.EqualTo(TimeSpan.FromSeconds(1)));
        });
    }

    [Test]
    public void ForgetToken_DropsTextBucketAndOfferCap()
    {
        for (var i = 0; i < 30; i++)
        {
            _guard.TryRecordOffer(TOKEN_A);
            _guard.RecordTextDelivered(TOKEN_A, TOKEN_B);
        }

        _guard.ForgetToken(TOKEN_A);

        Assert.Multiple(() =>
        {
            Assert.That(_guard.GetTextWait(TOKEN_A), Is.Null);
            Assert.That(_guard.TryRecordOffer(TOKEN_A), Is.Null);
        });
    }
}
