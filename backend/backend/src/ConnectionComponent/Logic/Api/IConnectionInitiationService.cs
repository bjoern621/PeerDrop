namespace backend.ConnectionComponent.Logic.Api;

public interface IConnectionInitiationService
{
    /// <summary>
    /// Registers the two clients as a connected pair and tells both to establish a direct connection.
    /// A client may hold connections to several partners, one per partner.
    /// Returns false and sends nothing if the pair is already connected.
    /// </summary>
    /// <param name="path">"offer" for an accepted transfer offer, "own_device" for two clients of one account,
    /// "reconnect" for a pair that a permission allows.</param>
    Task<bool> InitiateConnection(string clientA, string clientB, string path);
}
