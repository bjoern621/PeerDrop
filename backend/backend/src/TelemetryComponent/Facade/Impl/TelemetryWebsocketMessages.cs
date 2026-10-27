using backend.TelemetryComponent.Common.Api.DTOs;
using backend.TelemetryComponent.Facade.Api;
using backend.TelemetryComponent.Logic.Api;
using backend.TokenComponent.Logic.Api;

namespace backend.TelemetryComponent.Facade.Impl;

public class TelemetryWebsocketMessages(IClientRegistry _clientRegistry, IUsageMetrics _usageMetrics) : ITelemetryWebsocketMessages
{
    public void SubscribeToMessageHandlers()
    {
        _clientRegistry.SubscribeToMessageType<PeerConnectionReportMessage>(PeerConnectionReportMessage.TypeString, (_, report) =>
        {
            _usageMetrics.RecordPeerConnection(report);
            return Task.CompletedTask;
        });

        _clientRegistry.SubscribeToMessageType<TransferReportMessage>(TransferReportMessage.TypeString, (_, report) =>
        {
            _usageMetrics.RecordTransfer(report);
            return Task.CompletedTask;
        });
    }
}
