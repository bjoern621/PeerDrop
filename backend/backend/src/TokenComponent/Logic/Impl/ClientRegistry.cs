using System.Collections.Concurrent;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using backend.TokenComponent.Common.Api.DTOs;
using backend.TokenComponent.Logic.Api;
using backend.TokenComponent.Logic.Types;
using backend.WebSocketComponent.Common.Api;
using backend.WebSocketComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Logic.Api;
using static backend.TokenComponent.Common.Api.ClientTokenFormat;

namespace backend.TokenComponent.Logic.Impl;

using MessageType = string;

/// <summary>
/// Hands out tokens from what it holds at the moment of the request: a requested token goes to the requester
/// while no client holds it, or to a requester that presents the holder's reclaim key.
/// Whether a holder still answers stays the transport's concern.
/// </summary>
public class ClientRegistry(
    IWebSocketTransport _transport,
    TimeProvider _timeProvider,
    ILogger<ClientRegistry> _logger) : IClientRegistry, ITransportEventHandler
{
    // A connection that sends no hello in this time gets closed.
    public static readonly TimeSpan HelloTimeout = TimeSpan.FromSeconds(5);
    private const int ReclaimKeyBytes = 16;

    private readonly Lock _lock = new();
    // Connections that opened and sent no hello yet.
    private readonly Dictionary<Guid, ClientConnectionInfo> _pending = [];
    private readonly Dictionary<string, Client> _byToken = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<Guid, Client> _byConnection = [];
    private readonly Random _random = new();
    private readonly ConcurrentDictionary<MessageType, List<MessageHandlerDelegate>> _messageHandlers = new();

    public event Func<ClientConnectedEvent, Task>? ClientConnected;
    public event Func<string, Task>? ClientDisconnected;

    public Task HandleConnectionOpened(Guid connectionId, ClientConnectionInfo info)
    {
        lock (_lock)
        {
            _pending[connectionId] = info;
        }

        _ = CloseWithoutHello(connectionId);
        return Task.CompletedTask;
    }

    private async Task CloseWithoutHello(Guid connectionId)
    {
        await Task.Delay(HelloTimeout, _timeProvider);

        bool waited;
        lock (_lock)
        {
            waited = _pending.Remove(connectionId);
        }

        if (waited)
        {
            _logger.LogDebug($"Connection {connectionId} sent no hello in time, closing it.");
            _transport.Close(connectionId);
        }
    }

    public async Task HandleMessage(Guid connectionId, MessageType messageType, JsonElement message)
    {
        ClientConnectionInfo? pendingInfo;
        Client? client;
        lock (_lock)
        {
            if (_pending.Remove(connectionId, out pendingInfo))
                client = null;
            else
                _byConnection.TryGetValue(connectionId, out client);
        }

        if (pendingInfo != null)
        {
            var hello = messageType == HelloMessage.TypeString ? ReadHello(message) : null;
            if (hello == null)
            {
                _logger.LogDebug($"Connection {connectionId} opened without a hello, closing it.");
                _transport.Close(connectionId);
                return;
            }

            await AssignToken(connectionId, pendingInfo, hello);
            return;
        }

        // A client whose token a later connection reclaimed stays unknown here until its connection closes.
        if (client != null)
            ForwardMessageToHandlers(client.Token, messageType, message);
    }

    private static HelloMessage? ReadHello(JsonElement message)
    {
        try
        {
            return message.Deserialize<HelloMessage>();
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private async Task AssignToken(Guid connectionId, ClientConnectionInfo info, HelloMessage hello)
    {
        Client client;
        Client? reclaimedFrom;
        lock (_lock)
        {
            (var token, reclaimedFrom) = PickTokenUnlocked(hello);
            client = new Client(connectionId, token, info, NewReclaimKey());
            if (reclaimedFrom != null)
                _byConnection.Remove(reclaimedFrom.ConnectionId);
            _byToken[token] = client;
            _byConnection[connectionId] = client;
        }

        if (reclaimedFrom != null)
        {
            // The old connection's session ends here, so every component drops what it kept for it.
            await RaiseClientDisconnected(reclaimedFrom.Token);
            _transport.Close(reclaimedFrom.ConnectionId);
        }

        await _transport.SendMessage(connectionId, new ClientTokenMessage
        {
            ClientToken = client.Token,
            ReclaimKey = client.ReclaimKey,
        });

        await RaiseClientConnected(client);
    }

    /// <summary>
    /// Returns the requested token if it fits the format and is free or the hello carries its reclaim key,
    /// together with the client that held it. Returns a generated free token otherwise.
    /// Must be called under _lock.
    /// </summary>
    private (string Token, Client? ReclaimedFrom) PickTokenUnlocked(HelloMessage hello)
    {
        var requested = hello.RequestedToken?.ToLowerInvariant();
        if (requested != null && IsValidRequestedToken(requested))
        {
            if (!_byToken.TryGetValue(requested, out var holder))
                return (requested, null);
            if (KeysMatch(holder.ReclaimKey, hello.ReclaimKey))
                return (requested, holder);
        }

        string generated;
        do
        {
            generated = GenerateClientToken();
        } while (_byToken.ContainsKey(generated));

        return (generated, null);
    }

    private static bool KeysMatch(string expected, string? presented) =>
        presented != null
        && CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(presented));

    private static string NewReclaimKey() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(ReclaimKeyBytes));

    /// <summary>
    /// Generates a client token as a proquint: a random 16-bit value encoded into a pronounceable
    /// five-letter con-vo-con-vo-con syllable (e.g. "kuras"), following the Wilkerson specification.
    /// The value maps losslessly to and from the token.
    /// Must be called under _lock, since Random is not thread-safe.
    /// </summary>
    private string GenerateClientToken()
    {
        int value = _random.Next(0x10000); // 16 bits

        return new string([
            ProquintConsonants[(value >> 12) & 0xF],
            ProquintVowels[(value >> 10) & 0x3],
            ProquintConsonants[(value >> 6) & 0xF],
            ProquintVowels[(value >> 4) & 0x3],
            ProquintConsonants[value & 0xF],
        ]);
    }

    public async Task HandleConnectionClosed(Guid connectionId)
    {
        Client? client;
        lock (_lock)
        {
            _pending.Remove(connectionId);
            if (!_byConnection.Remove(connectionId, out client))
                return;
            _byToken.Remove(client.Token);
        }

        await RaiseClientDisconnected(client.Token);
    }

    private async Task RaiseClientConnected(Client client)
    {
        if (ClientConnected == null)
            return;

        var payload = new ClientConnectedEvent
        {
            ClientToken = client.Token,
            RemoteIpAddress = client.Info.RemoteIpAddress,
            UserAgent = client.Info.UserAgent,
        };

        foreach (var handler in ClientConnected.GetInvocationList().Cast<Func<ClientConnectedEvent, Task>>())
        {
            await handler(payload);
        }
    }

    private async Task RaiseClientDisconnected(string clientToken)
    {
        if (ClientDisconnected == null)
            return;

        foreach (var handler in ClientDisconnected.GetInvocationList().Cast<Func<string, Task>>())
        {
            await handler(clientToken);
        }
    }

    public bool RemoteTokenExists(string remoteToken)
    {
        lock (_lock)
        {
            return _byToken.ContainsKey(remoteToken);
        }
    }

    public Task<bool> SendMessage(string clientToken, ITypedMessage message)
    {
        Client? client;
        lock (_lock)
        {
            _byToken.TryGetValue(clientToken, out client);
        }

        return client == null ? Task.FromResult(false) : _transport.SendMessage(client.ConnectionId, message);
    }

    public void SubscribeToMessageType<T>(MessageType messageType, TypedMessageHandlerDelegate<T> handler)
    {
        Task wrapper(string clientToken, JsonElement messageData)
        {
            try
            {
                var typedData = messageData.Deserialize<T>();
                if (typedData == null)
                {
                    _logger.LogError($"Warning: Failed to deserialize message of type {messageType} to {typeof(T).Name}");
                    return Task.CompletedTask;
                }

                return handler(clientToken, typedData);
            }
            catch (JsonException ex)
            {
                _logger.LogError($"Error deserializing message of type {messageType} to {typeof(T).Name}: {ex.Message}");
                return Task.CompletedTask;
            }
        }

        var handlers = _messageHandlers.GetOrAdd(messageType, _ => []);

        lock (handlers)
        {
            Debug.Assert(!handlers.Contains(wrapper), "Handler already registered for this message type");

            handlers.Add(wrapper);
        }
    }

    private void ForwardMessageToHandlers(string senderClientToken, MessageType messageType, JsonElement messageData)
    {
        if (!_messageHandlers.TryGetValue(messageType, out var handlers))
            return;

        lock (handlers)
        {
            handlers.ForEach(handler =>
            {
                handler(senderClientToken, messageData);
            });
        }
    }

    public List<string> GetClientTokensForUserId(int userId)
    {
        lock (_lock)
        {
            return [.. _byToken.Values.Where(client => client.Info.UserId == userId).Select(client => client.Token)];
        }
    }

    public int? GetUserIdForClientToken(string clientToken)
    {
        lock (_lock)
        {
            return _byToken.TryGetValue(clientToken, out var client) ? client.Info.UserId : null;
        }
    }

    public bool AreSignedInWithSameAccount(string clientTokenA, string clientTokenB)
    {
        var userIdA = GetUserIdForClientToken(clientTokenA);

        return userIdA != null && userIdA == GetUserIdForClientToken(clientTokenB);
    }

    public string? GetRemoteIpAddressForClientToken(string clientToken)
    {
        lock (_lock)
        {
            return _byToken.TryGetValue(clientToken, out var client) ? client.Info.RemoteIpAddress : null;
        }
    }

    public (int SignedIn, int Anonymous) CountClients()
    {
        lock (_lock)
        {
            var signedIn = _byToken.Values.Count(client => client.Info.UserId != null);
            return (signedIn, _byToken.Count - signedIn);
        }
    }
}
