using backend.TelemetryComponent.Common.Api.DTOs;
using backend.TelemetryComponent.Facade.Api;
using backend.TelemetryComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.TelemetryComponent.Facade.Impl;

public class TelemetryWebsocketMessages(IWebSocketHandler _webSocketHandler, IUsageMetrics _usageMetrics) : ITelemetryWebsocketMessages
{
    public void SubscribeToMessageHandlers()
    {
        _webSocketHandler.SubscribeToMessageType<PeerConnectionReportMessage>(PeerConnectionReportMessage.TypeString, (_, report) =>
        {
            _usageMetrics.RecordPeerConnection(report);
            return Task.CompletedTask;
        });

        _webSocketHandler.SubscribeToMessageType<TransferReportMessage>(TransferReportMessage.TypeString, (_, report) =>
        {
            _usageMetrics.RecordTransfer(report);
            return Task.CompletedTask;
        });
    }
}
