namespace backend.WebSocketComponent.Common.Api;

/// <summary>
/// What the server learns about a connection when it opens. Stays fixed for the connection's lifetime.
/// </summary>
/// <param name="UserId">Account of the session cookie, null without a session. The client cannot influence it.</param>
/// <param name="RemoteIpAddress">Null if the address could not be determined.</param>
/// <param name="UserAgent">Null if the client sent none.</param>
public record ClientConnectionInfo(int? UserId, string? RemoteIpAddress, string? UserAgent);
