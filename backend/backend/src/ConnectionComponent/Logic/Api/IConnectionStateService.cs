namespace backend.ConnectionComponent.Logic.Api;

public interface IConnectionStateService
{
    /// <summary>
    /// Pushes the current connection-request state snapshot to each given
    /// client. Clients that are no longer connected are skipped. Call after
    /// every mutation of the open-request state, once per affected client.
    /// </summary>
    Task PushStateTo(params string?[] clientTokens);
}
