using backend.TelemetryComponent.Common.Api.DTOs;

namespace backend.TelemetryComponent.Logic.Api;

/// <summary>
/// Counts what PeerDrop is used for. Attributes carry no token, address or account.
/// </summary>
public interface IUsageMetrics
{
    void ConnectionRequested(bool targetFound);
    void ConnectionAnswered(bool accepted);

    /// <param name="path">"token" for an accepted request, "account" for a quick connect to an own device.</param>
    void ConnectionInitiated(string path);

    /// <summary>
    /// Values outside the documented sets are dropped: the report comes from the client.
    /// </summary>
    void RecordPeerConnection(PeerConnectionReportMessage report);

    /// <summary>
    /// Values outside the documented sets are dropped: the report comes from the client.
    /// </summary>
    void RecordTransfer(TransferReportMessage report);
}
