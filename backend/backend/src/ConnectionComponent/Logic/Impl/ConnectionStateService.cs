using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Dataaccess.Api;
using backend.ConnectionComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.ConnectionComponent.Logic.Impl;

public class ConnectionStateService(
    IWebSocketHandler _webSocketHandler,
    IOpenConnectionRequestRepository _openConnectionRequestRepository) : IConnectionStateService
{
    public async Task PushStateTo(params string?[] clientTokens)
    {
        foreach (var clientToken in clientTokens.Where(t => t != null).Distinct())
        {
            if (!_webSocketHandler.RemoteTokenExists(clientToken!))
            {
                continue;
            }

            _openConnectionRequestRepository.TryGetTarget(clientToken!, out var outgoingTarget);

            var message = new ConnectionStateMessage
            {
                OutgoingRequestTarget = outgoingTarget,
                IncomingRequesters = [.. _openConnectionRequestRepository.GetRequestersForTarget(clientToken!)],
            };

            await _webSocketHandler.SendMessage(clientToken!, message);
        }
    }
}
