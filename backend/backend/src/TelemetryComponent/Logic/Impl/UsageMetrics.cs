using System.Diagnostics.Metrics;
using backend.TelemetryComponent.Common.Api.DTOs;
using backend.TelemetryComponent.Dataaccess.Api;
using backend.TelemetryComponent.Logic.Api;
using backend.TokenComponent.Logic.Api;
using Npgsql;

namespace backend.TelemetryComponent.Logic.Impl;

public class UsageMetrics : IUsageMetrics
{
    public const string MeterName = "PeerDrop";

    private static readonly HashSet<string> Routes = ["host", "reflexive", "relay"];
    private static readonly HashSet<string> ConnectionOutcomes = ["connected", "failed"];
    private static readonly HashSet<string> TransferOutcomes = ["completed", "failed"];

    // A client reporting more than this is lying or broken.
    private const double MaxSetupSeconds = 600;
    private const long MaxTransferBytes = 1L << 40;

    private readonly ILogger<UsageMetrics> _logger;
    private readonly Counter<long> _tokenLookups;
    private readonly Counter<long> _texts;
    private readonly Counter<long> _transferOffers;
    private readonly Counter<long> _transferAnswers;
    private readonly Counter<long> _connectionsInitiated;
    private readonly Counter<long> _peerConnections;
    private readonly Histogram<double> _peerConnectionSetup;
    private readonly Counter<long> _transfers;
    private readonly Counter<long> _transferBytes;

    public UsageMetrics(
        IMeterFactory meterFactory,
        IClientRegistry clientRegistry,
        IUsageCountRepository usageCountRepository,
        ILogger<UsageMetrics> logger)
    {
        _logger = logger;
        var meter = meterFactory.Create(MeterName);

        meter.CreateObservableUpDownCounter(
            "peerdrop.clients",
            () => MeasureClients(clientRegistry),
            unit: "{client}",
            description: "Clients holding a WebSocket connection");
        meter.CreateObservableGauge(
            "peerdrop.accounts",
            () => MeasureCount(usageCountRepository.CountAccounts),
            unit: "{account}",
            description: "Registered accounts");
        meter.CreateObservableGauge(
            "peerdrop.devices",
            () => MeasureCount(usageCountRepository.CountDevices),
            unit: "{device}",
            description: "Devices registered with at least one account");

        _tokenLookups = meter.CreateCounter<long>(
            "peerdrop.token.lookups",
            unit: "{lookup}",
            description: "Lookups of a token, by whether it belonged to a connected client or the requester was locked out");
        _texts = meter.CreateCounter<long>(
            "peerdrop.texts",
            unit: "{text}",
            description: "Texts sent to a token, by whether the server forwarded or rejected them");
        _transferOffers = meter.CreateCounter<long>(
            "peerdrop.transfer.offers",
            unit: "{offer}",
            description: "Transfer offers sent to a token, by whether the server forwarded or rejected them");
        _transferAnswers = meter.CreateCounter<long>(
            "peerdrop.transfer.answers",
            unit: "{answer}",
            description: "Answers of the receiver to a forwarded transfer offer");
        _connectionsInitiated = meter.CreateCounter<long>(
            "peerdrop.connections.initiated",
            unit: "{connection}",
            description: "Peer pairs told to start a WebRTC connection");
        _peerConnections = meter.CreateCounter<long>(
            "peerdrop.peer_connections",
            unit: "{connection}",
            description: "WebRTC connections that connected or failed, as reported by one of the two peers");
        _peerConnectionSetup = meter.CreateHistogram(
            "peerdrop.peer_connection.setup.duration",
            unit: "s",
            description: "Time from creating the peer connection to its outcome",
            advice: new InstrumentAdvice<double> { HistogramBucketBoundaries = [0.25, 0.5, 1, 2, 3, 5, 10, 20, 30, 60] });
        _transfers = meter.CreateCounter<long>(
            "peerdrop.transfers",
            unit: "{file}",
            description: "Ended file transfers, as reported by the sender");
        _transferBytes = meter.CreateCounter<long>(
            "peerdrop.transfer.bytes",
            unit: "By",
            description: "Bytes sent in ended file transfers, as reported by the sender");
    }

    public void TokenLookedUp(string outcome) =>
        _tokenLookups.Add(1, new KeyValuePair<string, object?>("outcome", outcome));

    public void TextHandled(string status) =>
        _texts.Add(1, new KeyValuePair<string, object?>("outcome", ToAttributeValue(status)));

    public void TransferOffered(string status) =>
        _transferOffers.Add(1, new KeyValuePair<string, object?>("outcome", ToAttributeValue(status)));

    public void TransferAnswered(bool accepted) =>
        _transferAnswers.Add(1, new KeyValuePair<string, object?>("accepted", accepted));

    public void ConnectionInitiated(string path) =>
        _connectionsInitiated.Add(1, new KeyValuePair<string, object?>("path", path));

    public void RecordPeerConnection(PeerConnectionReportMessage report)
    {
        if (!ConnectionOutcomes.Contains(report.Outcome) || !IsValidRoute(report.Route)
            || report.SetupMs < 0 || report.SetupMs / 1000 > MaxSetupSeconds)
        {
            _logger.LogDebug("Dropped peer connection report with outcome {Outcome}, route {Route}", report.Outcome, report.Route);
            return;
        }

        var outcome = new KeyValuePair<string, object?>("outcome", report.Outcome);
        var route = new KeyValuePair<string, object?>("route", report.Route ?? "none");
        _peerConnections.Add(1, outcome, route);
        _peerConnectionSetup.Record(report.SetupMs / 1000, outcome, route);
    }

    public void RecordTransfer(TransferReportMessage report)
    {
        if (!TransferOutcomes.Contains(report.Outcome) || !IsValidRoute(report.Route)
            || report.Bytes < 0 || report.Bytes > MaxTransferBytes)
        {
            _logger.LogDebug("Dropped transfer report with outcome {Outcome}, route {Route}", report.Outcome, report.Route);
            return;
        }

        var outcome = new KeyValuePair<string, object?>("outcome", report.Outcome);
        var route = new KeyValuePair<string, object?>("route", report.Route ?? "none");
        _transfers.Add(1, outcome, route);
        _transferBytes.Add(report.Bytes, outcome, route);
    }

    private static bool IsValidRoute(string? route) => route == null || Routes.Contains(route);

    // Attribute values follow the OpenTelemetry snake_case convention, the wire statuses kebab-case.
    private static string ToAttributeValue(string status) => status.Replace('-', '_');

    private static IEnumerable<Measurement<int>> MeasureClients(IClientRegistry clientRegistry)
    {
        var (signedIn, anonymous) = clientRegistry.CountClients();
        return
        [
            new Measurement<int>(signedIn, new KeyValuePair<string, object?>("signed_in", true)),
            new Measurement<int>(anonymous, new KeyValuePair<string, object?>("signed_in", false)),
        ];
    }

    private IEnumerable<Measurement<long>> MeasureCount(Func<long> count)
    {
        try
        {
            return [new Measurement<long>(count())];
        }
        catch (NpgsqlException ex)
        {
            _logger.LogWarning("Usage count unavailable: {Message}", ex.Message);
            return [];
        }
    }
}
