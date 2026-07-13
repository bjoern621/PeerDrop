using backend.ConnectionComponent.Dataaccess.Api;

namespace backend.ConnectionComponent.Logic.Api;

public interface IConnectionInitiationService
{
    /// <summary>
    /// Raised after both clients have been told to establish their connection.
    /// Arguments are the two client tokens. Handlers may be asynchronous and
    /// are awaited.
    /// </summary>
    event Func<string, string, Task>? ConnectionEstablished;

    /// <summary>
    /// Initiates a direct connection between two clients, identified by their tokens.
    /// All pending connection requests involving either client will be cancelled.
    /// </summary>
    Task InitiateConnection(string clientA, string clientB);
}
