using backend.MessagingComponent.Dataaccess.Impl;
using backend.MessagingComponent.Common.Api.DTOs;
using backend.MessagingComponent.Common.Api.Validators;
using backend.MessagingComponent.Logic.Impl;
using backend.TelemetryComponent.Logic.Api;
using backend.tests.TestUtils;
using backend.TokenComponent.Logic.Api;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.tests.MessagingComponent.Logic.Impl;

[Category("UnitTest")]
public class TextServiceTest
{
    private const string SENDER = "sabak";
    private const string RECEIVER = "rinot";
    private const string OFFLINE = "lukid";
    private const string SENDER_KEY = "BHN0dWJrZXk=";
    private const string IV = "AAECAwQFBgcICQoL";

    private Mock<IClientRegistry> _mockHandler;
    private PublicKeyRepository _publicKeys;
    private SentMessages _sent;
    private HashSet<string> _online;
    private ManualTimeProvider _clock;
    private TextService _service;

    [SetUp]
    public void Setup()
    {
        _mockHandler = new Mock<IClientRegistry>();
        _online = [SENDER, RECEIVER];
        _mockHandler.Setup(h => h.RemoteTokenExists(It.IsAny<string>())).Returns<string>(t => _online.Contains(t));
        _publicKeys = new PublicKeyRepository();
        _publicKeys.Set(SENDER, SENDER_KEY);
        _sent = new SentMessages()
            .Capture<IncomingTextMessage>(_mockHandler)
            .Capture<TextResultMessage>(_mockHandler);

        _clock = new ManualTimeProvider();
        _service = new TextService(
            _mockHandler.Object,
            _publicKeys,
            new AbuseGuard(_clock),
            new Mock<IUsageMetrics>().Object,
            NullLogger<TextService>.Instance);
    }

    private static TextMessage Text(string to, string ciphertext = "c2VjcmV0", string id = "t1") =>
        new() { Id = id, To = to, Iv = IV, Ciphertext = ciphertext };

    private TextResultMessage LastResult() => _sent.To<TextResultMessage>(SENDER)[^1];

    [Test]
    public async Task HandleText_ReceiverOnline_ForwardsWithSenderKeyAndReportsDelivered()
    {
        await _service.HandleText(SENDER, Text(RECEIVER.ToUpperInvariant()));

        var forwarded = _sent.To<IncomingTextMessage>(RECEIVER).Single();
        Assert.Multiple(() =>
        {
            Assert.That(forwarded.From, Is.EqualTo(SENDER));
            Assert.That(forwarded.FromKey, Is.EqualTo(SENDER_KEY));
            Assert.That(forwarded.Iv, Is.EqualTo(IV));
            Assert.That(forwarded.Ciphertext, Is.EqualTo("c2VjcmV0"));
            Assert.That(LastResult().Id, Is.EqualTo("t1"));
            Assert.That(LastResult().Status, Is.EqualTo(TextResultMessage.STATUS_DELIVERED));
            Assert.That(LastResult().RetryAfterMs, Is.Null);
        });
    }

    [Test]
    public async Task HandleText_CiphertextAboveLimit_ReportsTooLarge()
    {
        var ciphertext = new string('A', EncryptedMessageValidator.MaxTextCiphertextChars + 1);

        await _service.HandleText(SENDER, Text(RECEIVER, ciphertext));

        Assert.Multiple(() =>
        {
            Assert.That(LastResult().Status, Is.EqualTo(TextResultMessage.STATUS_TOO_LARGE));
            Assert.That(_sent.To<IncomingTextMessage>(RECEIVER), Is.Empty);
        });
    }

    [Test]
    public async Task HandleText_CiphertextAtLimit_IsDelivered()
    {
        var ciphertext = new string('A', EncryptedMessageValidator.MaxTextCiphertextChars);

        await _service.HandleText(SENDER, Text(RECEIVER, ciphertext));

        Assert.That(LastResult().Status, Is.EqualTo(TextResultMessage.STATUS_DELIVERED));
    }

    [Test]
    public async Task HandleText_SixthTextInABurst_ReportsRateLimitedWithRetry()
    {
        for (var i = 0; i < 5; i++)
        {
            await _service.HandleText(SENDER, Text(RECEIVER));
        }

        await _service.HandleText(SENDER, Text(RECEIVER));

        Assert.Multiple(() =>
        {
            Assert.That(LastResult().Status, Is.EqualTo(TextResultMessage.STATUS_RATE_LIMITED));
            Assert.That(LastResult().RetryAfterMs, Is.EqualTo(6000));
            Assert.That(_sent.To<IncomingTextMessage>(RECEIVER), Has.Count.EqualTo(5));
        });
    }

    [Test]
    public async Task HandleText_ReceiverOffline_ReportsUnknownAndLocksOnSixthMiss()
    {
        for (var i = 0; i < 5; i++)
        {
            await _service.HandleText(SENDER, Text(OFFLINE));
            Assert.That(LastResult().RetryAfterMs, Is.Null, $"miss {i + 1}");
        }

        await _service.HandleText(SENDER, Text(OFFLINE));

        Assert.Multiple(() =>
        {
            Assert.That(LastResult().Status, Is.EqualTo(TextResultMessage.STATUS_UNKNOWN));
            Assert.That(LastResult().RetryAfterMs, Is.EqualTo(60_000));
        });
    }

    [Test]
    public async Task HandleText_ReceiverOffline_CostsNoTextToken()
    {
        for (var i = 0; i < 5; i++)
        {
            await _service.HandleText(SENDER, Text(OFFLINE));
        }

        await _service.HandleText(SENDER, Text(RECEIVER));

        Assert.That(LastResult().Status, Is.EqualTo(TextResultMessage.STATUS_DELIVERED));
    }

    [Test]
    public async Task HandleText_ReceiverGotThirtyTexts_ReportsUndelivered()
    {
        for (var i = 0; i < 30; i++)
        {
            var sender = $"s{i}";
            _online.Add(sender);
            await _service.HandleText(sender, Text(RECEIVER));
        }

        await _service.HandleText(SENDER, Text(RECEIVER));

        Assert.Multiple(() =>
        {
            Assert.That(LastResult().Status, Is.EqualTo(TextResultMessage.STATUS_UNDELIVERED));
            Assert.That(LastResult().RetryAfterMs, Is.Null);
            Assert.That(_sent.To<IncomingTextMessage>(RECEIVER), Has.Count.EqualTo(30));
        });
    }

    [Test]
    public async Task HandleText_SenderLocked_ReportsUnknownWithoutForwarding()
    {
        for (var i = 0; i < 6; i++)
        {
            await _service.HandleText(SENDER, Text(OFFLINE));
        }
        _clock.Advance(TimeSpan.FromSeconds(20));

        await _service.HandleText(SENDER, Text(RECEIVER));

        Assert.Multiple(() =>
        {
            Assert.That(LastResult().Status, Is.EqualTo(TextResultMessage.STATUS_UNKNOWN));
            Assert.That(LastResult().RetryAfterMs, Is.EqualTo(40_000));
            Assert.That(_sent.To<IncomingTextMessage>(RECEIVER), Is.Empty);
        });
    }

    [Test]
    public async Task HandleText_WhileLocked_TakesNoTextToken()
    {
        for (var i = 0; i < 6; i++)
        {
            await _service.HandleText(SENDER, Text(OFFLINE));
        }
        for (var i = 0; i < 5; i++)
        {
            await _service.HandleText(SENDER, Text(RECEIVER));
        }
        _clock.Advance(TimeSpan.FromMinutes(1));

        for (var i = 0; i < 5; i++)
        {
            await _service.HandleText(SENDER, Text(RECEIVER));
        }

        Assert.Multiple(() =>
        {
            Assert.That(LastResult().Status, Is.EqualTo(TextResultMessage.STATUS_DELIVERED));
            Assert.That(_sent.To<IncomingTextMessage>(RECEIVER), Has.Count.EqualTo(5));
        });
    }

    [TestCase("", RECEIVER, IV)]
    [TestCase("t1", "", IV)]
    [TestCase("t1", RECEIVER, "AAEC")]
    [TestCase("t1", RECEIVER, "not base64!")]
    public async Task HandleText_MalformedField_SendsNothing(string id, string to, string iv)
    {
        await _service.HandleText(SENDER, new TextMessage { Id = id, To = to, Iv = iv, Ciphertext = "c2VjcmV0" });

        Assert.That(_sent.Count, Is.Zero);
    }

    [Test]
    public async Task HandleText_IdLongerThan64Characters_SendsNothing()
    {
        await _service.HandleText(SENDER, Text(RECEIVER, id: new string('x', 65)));

        Assert.That(_sent.Count, Is.Zero);
    }
}
