using backend.ConnectionComponent.Dataaccess.Api;

namespace backend.ConnectionComponent.Logic.Api;

public interface IConnectionInitiationService
{
    /// <summary>
    /// Initiates a direct connection between two clients, identified by their tokens.
    /// All pending connection requests involving either client will be cancelled.
    /// </summary>
    Task InitiateConnection(string clientA, string clientB);
}
