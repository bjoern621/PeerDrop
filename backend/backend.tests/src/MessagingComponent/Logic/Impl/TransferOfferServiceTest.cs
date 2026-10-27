using backend.ConnectionComponent.Dataaccess.Impl;
using backend.ConnectionComponent.Logic.Api;
using backend.MessagingComponent.Common.Api.DTOs;
using backend.MessagingComponent.Dataaccess.Impl;
using backend.MessagingComponent.Logic.Impl;
using backend.TelemetryComponent.Logic.Api;
using backend.tests.TestUtils;
using backend.TokenComponent.Logic.Api;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.tests.MessagingComponent.Logic.Impl;

[Category("UnitTest")]
public class TransferOfferServiceTest
{
    private const string SENDER = "sabak";
    private const string RECEIVER = "rinot";
    private const string OFFLINE = "lukid";
    private const string SENDER_KEY = "BHN0dWJrZXk=";
    private const string IV = "AAECAwQFBgcICQoL";

    private Mock<IClientRegistry> _mockHandler;
    private PublicKeyRepository _publicKeys;
    private Mock<IConnectionInitiationService> _mockConnectionInitiationService;
    private SentMessages _sent;
    private PairRepository _pairRepository;
    private ManualTimeProvider _clock;
    private TransferOfferService _service;

    [SetUp]
    public void Setup()
    {
        _mockHandler = new Mock<IClientRegistry>();
        _mockHandler.Setup(h => h.RemoteTokenExists(It.IsAny<string>())).Returns<string>(t => t is SENDER or RECEIVER);
        _publicKeys = new PublicKeyRepository();
        _publicKeys.Set(SENDER, SENDER_KEY);
        _sent = new SentMessages()
            .Capture<IncomingTransferOfferMessage>(_mockHandler)
            .Capture<TransferOfferResultMessage>(_mockHandler)
            .Capture<TransferOfferCancelMessage>(_mockHandler)
            .Capture<TransferAnswerMessage>(_mockHandler);

        _mockConnectionInitiationService = new Mock<IConnectionInitiationService>();
        _pairRepository = new PairRepository();

        _clock = new ManualTimeProvider();
        _service = new TransferOfferService(
            _mockHandler.Object,
            _publicKeys,
            new AbuseGuard(_clock),
            new PendingOfferRepository(),
            _pairRepository,
            _mockConnectionInitiationService.Object,
            new Mock<IUsageMetrics>().Object,
            NullLogger<TransferOfferService>.Instance);
    }

    private Task Offer(string offerId, string to = RECEIVER) =>
        _service.HandleTransferOffer(SENDER, new TransferOfferMessage { OfferId = offerId, To = to, Iv = IV, Ciphertext = "c3VtbWFyeQ==" });

    private TransferOfferResultMessage LastResult() => _sent.To<TransferOfferResultMessage>(SENDER)[^1];

    [Test]
    public async Task HandleTransferOffer_ReceiverOnline_ForwardsWithSenderKeyAndReportsDelivered()
    {
        await Offer("o1");

        var forwarded = _sent.To<IncomingTransferOfferMessage>(RECEIVER).Single();
        Assert.Multiple(() =>
        {
            Assert.That(forwarded.OfferId, Is.EqualTo("o1"));
            Assert.That(forwarded.From, Is.EqualTo(SENDER));
            Assert.That(forwarded.FromKey, Is.EqualTo(SENDER_KEY));
            Assert.That(forwarded.Ciphertext, Is.EqualTo("c3VtbWFyeQ=="));
            Assert.That(LastResult().Status, Is.EqualTo(TransferOfferResultMessage.STATUS_DELIVERED));
        });
    }

    [Test]
    public async Task HandleTransferOffer_ReceiverOffline_ReportsUnknownAndLocksOnSixthMiss()
    {
        for (var i = 0; i < 6; i++)
        {
            await Offer($"o{i}", OFFLINE);
        }

        Assert.Multiple(() =>
        {
            Assert.That(LastResult().Status, Is.EqualTo(TransferOfferResultMessage.STATUS_UNKNOWN));
            Assert.That(LastResult().RetryAfterMs, Is.EqualTo(60_000));
        });
    }

    [Test]
    public async Task HandleTransferOffer_SenderLocked_ReportsUnknownWithoutForwarding()
    {
        for (var i = 0; i < 6; i++)
        {
            await Offer($"miss{i}", OFFLINE);
        }
        _clock.Advance(TimeSpan.FromSeconds(20));

        await Offer("o1");
        await _service.HandleTransferAnswer(RECEIVER, new TransferAnswerMessage { OfferId = "o1", Accepted = true });

        Assert.Multiple(() =>
        {
            Assert.That(LastResult().Status, Is.EqualTo(TransferOfferResultMessage.STATUS_UNKNOWN));
            Assert.That(LastResult().RetryAfterMs, Is.EqualTo(40_000));
            Assert.That(_sent.To<IncomingTransferOfferMessage>(RECEIVER), Is.Empty);
            Assert.That(_sent.To<TransferAnswerMessage>(SENDER), Is.Empty);
        });
    }

    [Test]
    public async Task HandleTransferOffer_WhileLocked_CountsNoOfferAgainstCap()
    {
        for (var i = 0; i < 6; i++)
        {
            await Offer($"miss{i}", OFFLINE);
        }
        for (var i = 0; i < 30; i++)
        {
            await Offer($"locked{i}");
        }
        _clock.Advance(TimeSpan.FromMinutes(1));

        for (var i = 0; i < 30; i++)
        {
            await Offer($"o{i}");
        }

        Assert.Multiple(() =>
        {
            Assert.That(LastResult().Status, Is.EqualTo(TransferOfferResultMessage.STATUS_DELIVERED));
            Assert.That(_sent.To<IncomingTransferOfferMessage>(RECEIVER), Has.Count.EqualTo(30));
        });
    }

    [Test]
    public async Task HandleTransferOffer_ThirtyFirstOfferWithinMinute_ReportsRateLimited()
    {
        for (var i = 0; i < 30; i++)
        {
            await Offer($"o{i}");
        }

        await Offer("o30");

        Assert.Multiple(() =>
        {
            Assert.That(LastResult().Status, Is.EqualTo(TransferOfferResultMessage.STATUS_RATE_LIMITED));
            Assert.That(LastResult().RetryAfterMs, Is.EqualTo(60_000));
            Assert.That(_sent.To<IncomingTransferOfferMessage>(RECEIVER), Has.Count.EqualTo(30));
        });
    }

    [Test]
    public async Task HandleTransferOffer_CiphertextAbove16KiB_SendsNothing()
    {
        await _service.HandleTransferOffer(SENDER, new TransferOfferMessage
        {
            OfferId = "o1", To = RECEIVER, Iv = IV, Ciphertext = new string('A', 16 * 1024 + 1),
        });

        Assert.That(_sent.Count, Is.Zero);
    }

    [Test]
    public async Task HandleTransferOffer_OfferIdAlreadyPending_SendsNothingMore()
    {
        await Offer("o1");
        var sentBefore = _sent.Count;

        await Offer("o1");

        Assert.That(_sent.Count, Is.EqualTo(sentBefore));
    }

    [Test]
    public async Task HandleTransferAnswer_Accepted_ForwardsAnswerRecordsPermissionAndInitiatesConnection()
    {
        await Offer("o1");

        await _service.HandleTransferAnswer(RECEIVER, new TransferAnswerMessage { OfferId = "o1", Accepted = true });

        var answer = _sent.To<TransferAnswerMessage>(SENDER).Single();
        Assert.Multiple(() =>
        {
            Assert.That(answer.OfferId, Is.EqualTo("o1"));
            Assert.That(answer.From, Is.EqualTo(RECEIVER));
            Assert.That(answer.Accepted, Is.True);
            Assert.That(answer.Gone, Is.False);
            Assert.That(_pairRepository.HasPermissionEitherWay(SENDER, RECEIVER), Is.True);
        });
        _mockConnectionInitiationService.Verify(s => s.InitiateConnection(SENDER, RECEIVER, "offer"), Times.Once);
    }

    [Test]
    public async Task HandleTransferAnswer_Declined_ForwardsAnswerWithoutPermission()
    {
        await Offer("o1");

        await _service.HandleTransferAnswer(RECEIVER, new TransferAnswerMessage { OfferId = "o1", Accepted = false });

        Assert.Multiple(() =>
        {
            Assert.That(_sent.To<TransferAnswerMessage>(SENDER).Single().Accepted, Is.False);
            Assert.That(_pairRepository.HasPermissionEitherWay(SENDER, RECEIVER), Is.False);
        });
        _mockConnectionInitiationService.Verify(
            s => s.InitiateConnection(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Test]
    public async Task HandleTransferAnswer_FromClientOtherThanReceiver_IsIgnored()
    {
        await Offer("o1");

        await _service.HandleTransferAnswer(SENDER, new TransferAnswerMessage { OfferId = "o1", Accepted = true });

        Assert.Multiple(() =>
        {
            Assert.That(_sent.To<TransferAnswerMessage>(SENDER), Is.Empty);
            Assert.That(_pairRepository.HasPermissionEitherWay(SENDER, RECEIVER), Is.False);
        });
    }

    [Test]
    public async Task HandleTransferOfferCancel_PendingOffer_TellsReceiverAndEndsOffer()
    {
        await Offer("o1");

        await _service.HandleTransferOfferCancel(SENDER, new TransferOfferCancelMessage { OfferId = "o1" });
        await _service.HandleTransferAnswer(RECEIVER, new TransferAnswerMessage { OfferId = "o1", Accepted = true });

        var cancel = _sent.To<TransferOfferCancelMessage>(RECEIVER).Single();
        Assert.Multiple(() =>
        {
            Assert.That(cancel.OfferId, Is.EqualTo("o1"));
            Assert.That(cancel.From, Is.EqualTo(SENDER));
            Assert.That(_sent.To<TransferAnswerMessage>(SENDER), Is.Empty);
        });
    }

    [Test]
    public async Task HandleTransferOfferCancel_UnknownOffer_SendsNothing()
    {
        await _service.HandleTransferOfferCancel(SENDER, new TransferOfferCancelMessage { OfferId = "o1" });

        Assert.That(_sent.Count, Is.Zero);
    }

    [Test]
    public async Task HandleClientDisconnected_Sender_CancelsOfferAtReceiver()
    {
        await Offer("o1");

        await _service.HandleClientDisconnected(SENDER);

        Assert.That(_sent.To<TransferOfferCancelMessage>(RECEIVER).Single().From, Is.EqualTo(SENDER));
    }

    [Test]
    public async Task HandleClientDisconnected_Receiver_AnswersSenderAsGone()
    {
        await Offer("o1");

        await _service.HandleClientDisconnected(RECEIVER);

        var answer = _sent.To<TransferAnswerMessage>(SENDER).Single();
        Assert.Multiple(() =>
        {
            Assert.That(answer.OfferId, Is.EqualTo("o1"));
            Assert.That(answer.From, Is.EqualTo(RECEIVER));
            Assert.That(answer.Accepted, Is.False);
            Assert.That(answer.Gone, Is.True);
        });
    }
}
