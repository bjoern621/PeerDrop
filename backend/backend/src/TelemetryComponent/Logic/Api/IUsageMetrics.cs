using backend.TelemetryComponent.Common.Api.DTOs;

namespace backend.TelemetryComponent.Logic.Api;

/// <summary>
/// Counts what PeerDrop is used for. Attributes carry no token, address or account.
/// </summary>
public interface IUsageMetrics
{
    /// <param name="outcome">"online", "unknown" or "locked".</param>
    void TokenLookedUp(string outcome);

    /// <param name="status">The status sent in text-result: "delivered", "undelivered", "rate-limited", "too-large" or "unknown".</param>
    void TextHandled(string status);

    /// <param name="status">The status sent in transfer-offer-result: "delivered", "unknown" or "rate-limited".</param>
    void TransferOffered(string status);

    void TransferAnswered(bool accepted);

    /// <param name="path">"offer" for an accepted transfer offer, "own_device" for two clients of one account,
    /// "reconnect" for a pair that a permission allows.</param>
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
