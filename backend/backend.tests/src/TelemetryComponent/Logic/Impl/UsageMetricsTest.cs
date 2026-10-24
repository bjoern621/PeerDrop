using backend.TelemetryComponent.Common.Api.DTOs;
using backend.TelemetryComponent.Dataaccess.Api;
using backend.TelemetryComponent.Logic.Impl;
using backend.WebSocketComponent.Logic.Api;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.Metrics.Testing;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Diagnostics.Metrics;

namespace backend.tests.TelemetryComponent.Logic.Impl;

[Category("UnitTest")]
public class UsageMetricsTest
{
    private ServiceProvider _services;
    private Mock<IWebSocketHandler> _mockHandler;
    private UsageMetrics _metrics;

    [SetUp]
    public void Setup()
    {
        _services = new ServiceCollection().AddMetrics().BuildServiceProvider();
        _mockHandler = new Mock<IWebSocketHandler>();
        var mockRepository = new Mock<IUsageCountRepository>();
        mockRepository.Setup(r => r.CountAccounts()).Returns(7);
        mockRepository.Setup(r => r.CountDevices()).Returns(11);
        _metrics = new UsageMetrics(_services.GetRequiredService<IMeterFactory>(), _mockHandler.Object, mockRepository.Object, NullLogger<UsageMetrics>.Instance);
    }

    [TearDown]
    public void TearDown()
    {
        _services.Dispose();
    }

    private MetricCollector<T> Collect<T>(string instrument) where T : struct =>
        new(_services.GetRequiredService<IMeterFactory>(), UsageMetrics.MeterName, instrument);

    [Test]
    public void RecordPeerConnection_CountsRelayRouteAndSetupSeconds()
    {
        using var connections = Collect<long>("peerdrop.peer_connections");
        using var setup = Collect<double>("peerdrop.peer_connection.setup.duration");

        _metrics.RecordPeerConnection(new PeerConnectionReportMessage { Outcome = "connected", Route = "relay", SetupMs = 1500 });

        var measurement = connections.GetMeasurementSnapshot().Single();
        Assert.That(measurement.Value, Is.EqualTo(1));
        Assert.That(measurement.Tags["route"], Is.EqualTo("relay"));
        Assert.That(measurement.Tags["outcome"], Is.EqualTo("connected"));
        Assert.That(setup.GetMeasurementSnapshot().Single().Value, Is.EqualTo(1.5));
    }

    [Test]
    public void RecordPeerConnection_FailedWithoutRoute_CountsRouteNone()
    {
        using var connections = Collect<long>("peerdrop.peer_connections");

        _metrics.RecordPeerConnection(new PeerConnectionReportMessage { Outcome = "failed", Route = null, SetupMs = 30000 });

        Assert.That(connections.GetMeasurementSnapshot().Single().Tags["route"], Is.EqualTo("none"));
    }

    [TestCase("connected", "satellite", 100)]
    [TestCase("exploded", "host", 100)]
    [TestCase("connected", "host", -1)]
    [TestCase("connected", "host", 3_600_000)]
    public void RecordPeerConnection_ValueOutsideDocumentedSet_RecordsNothing(string outcome, string route, double setupMs)
    {
        using var connections = Collect<long>("peerdrop.peer_connections");

        _metrics.RecordPeerConnection(new PeerConnectionReportMessage { Outcome = outcome, Route = route, SetupMs = setupMs });

        Assert.That(connections.GetMeasurementSnapshot(), Is.Empty);
    }

    [Test]
    public void RecordTransfer_AddsFileAndBytes()
    {
        using var transfers = Collect<long>("peerdrop.transfers");
        using var bytes = Collect<long>("peerdrop.transfer.bytes");

        _metrics.RecordTransfer(new TransferReportMessage { Outcome = "completed", Route = "host", Bytes = 4096 });

        Assert.That(transfers.GetMeasurementSnapshot().Single().Value, Is.EqualTo(1));
        Assert.That(bytes.GetMeasurementSnapshot().Single().Value, Is.EqualTo(4096));
    }

    [TestCase(-1L)]
    [TestCase(1L << 41)]
    public void RecordTransfer_ByteCountOutOfRange_RecordsNothing(long reportedBytes)
    {
        using var bytes = Collect<long>("peerdrop.transfer.bytes");

        _metrics.RecordTransfer(new TransferReportMessage { Outcome = "completed", Route = "host", Bytes = reportedBytes });

        Assert.That(bytes.GetMeasurementSnapshot(), Is.Empty);
    }

    [TestCase("rate-limited", "rate_limited")]
    [TestCase("too-large", "too_large")]
    [TestCase("delivered", "delivered")]
    public void TextHandled_CountsStatusAsSnakeCaseOutcome(string status, string outcome)
    {
        using var texts = Collect<long>("peerdrop.texts");

        _metrics.TextHandled(status);

        Assert.That(texts.GetMeasurementSnapshot().Single().Tags["outcome"], Is.EqualTo(outcome));
    }

    [Test]
    public void TransferOffered_CountsStatusAsSnakeCaseOutcome()
    {
        using var offers = Collect<long>("peerdrop.transfer.offers");

        _metrics.TransferOffered("rate-limited");

        Assert.That(offers.GetMeasurementSnapshot().Single().Tags["outcome"], Is.EqualTo("rate_limited"));
    }

    [Test]
    public void TokenLookedUp_CountsOutcome()
    {
        using var lookups = Collect<long>("peerdrop.token.lookups");

        _metrics.TokenLookedUp("locked");

        Assert.That(lookups.GetMeasurementSnapshot().Single().Tags["outcome"], Is.EqualTo("locked"));
    }

    [Test]
    public void TransferAnswered_CountsAccepted()
    {
        using var answers = Collect<long>("peerdrop.transfer.answers");

        _metrics.TransferAnswered(true);

        Assert.That(answers.GetMeasurementSnapshot().Single().Tags["accepted"], Is.EqualTo(true));
    }

    [Test]
    public void ConnectionInitiated_CountsPath()
    {
        using var connections = Collect<long>("peerdrop.connections.initiated");

        _metrics.ConnectionInitiated("own_device");

        Assert.That(connections.GetMeasurementSnapshot().Single().Tags["path"], Is.EqualTo("own_device"));
    }

    [Test]
    public void Clients_SplitBySession()
    {
        _mockHandler.Setup(h => h.CountClients()).Returns((2, 5));
        using var clients = Collect<int>("peerdrop.clients");

        clients.RecordObservableInstruments();

        var measurements = clients.GetMeasurementSnapshot();
        Assert.That(measurements.Single(m => (bool)m.Tags["signed_in"]!).Value, Is.EqualTo(2));
        Assert.That(measurements.Single(m => !(bool)m.Tags["signed_in"]!).Value, Is.EqualTo(5));
    }

    [Test]
    public void Accounts_ReadFromRepository()
    {
        using var accounts = Collect<long>("peerdrop.accounts");

        accounts.RecordObservableInstruments();

        Assert.That(accounts.GetMeasurementSnapshot().Single().Value, Is.EqualTo(7));
    }
}
