using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Dataaccess.Api;
using backend.ConnectionComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.ConnectionComponent.Logic.Impl;

public class ConnectionInitiationService : IConnectionInitiationService
{
    private readonly IWebSocketHandler _webSocketHandler;
    private readonly IOpenConnectionRequestRepository _openConnectionRequestRepository;

    public event Func<string, string, Task>? ConnectionEstablished;

    public ConnectionInitiationService(IWebSocketHandler webSocketHandler, IOpenConnectionRequestRepository openConnectionRequestRepository)
    {
        _webSocketHandler = webSocketHandler;
        _openConnectionRequestRepository = openConnectionRequestRepository;
    }

    public async Task InitiateConnection(string clientA, string clientB)
    {
        // Clear any open requests involving either client, as they are now connecting.
        _openConnectionRequestRepository.TryRemove(clientA, out _);
        _openConnectionRequestRepository.TryRemove(clientB, out _);

        // Also, cancel any pending requests where either client was the target.
        var cancelledRequestersA = _openConnectionRequestRepository.FindAndRemoveRequestersForTarget(clientA);
        var cancelledRequestersB = _openConnectionRequestRepository.FindAndRemoveRequestersForTarget(clientB);

        // Notify all cancelled requesters.
        var cancellationMessageA = new ConnectionResponseMessage { Accepted = false, RemoteToken = clientA };
        foreach (var requester in cancelledRequestersA)
        {
            await _webSocketHandler.SendMessage(requester, cancellationMessageA);
        }

        var cancellationMessageB = new ConnectionResponseMessage { Accepted = false, RemoteToken = clientB };
        foreach (var requester in cancelledRequestersB)
        {
            await _webSocketHandler.SendMessage(requester, cancellationMessageB);
        }

        // Tell the two clients to establish their connection.
        var messageToA = new EstablishConnectionMessage { RemoteToken = clientB };
        await _webSocketHandler.SendMessage(clientA, messageToA);

        var messageToB = new EstablishConnectionMessage { RemoteToken = clientA };
        await _webSocketHandler.SendMessage(clientB, messageToB);

        if (ConnectionEstablished != null)
        {
            foreach (var handler in ConnectionEstablished.GetInvocationList().Cast<Func<string, string, Task>>())
            {
                await handler(clientA, clientB);
            }
        }
    }
}
