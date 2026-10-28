using backend.WebSocketComponent.Common.Api;

namespace backend.TokenComponent.Logic.Types;

/// <param name="ReclaimKey">Secret that the client got with its token. A later connection presenting it takes the token over.</param>
public record Client(Guid ConnectionId, string Token, ClientConnectionInfo Info, string ReclaimKey);
