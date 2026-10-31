namespace backend.ConnectionComponent.Dataaccess.Api;

/// <summary>
/// Holds in memory which clients may connect to each other and which are connected.
/// Tokens compare case-insensitively.
/// Can be called concurrently.
/// </summary>
public interface IPairRepository
{
    /// <summary>
    /// Records that the sender may send to the receiver. Nothing happens if the permission exists.
    /// </summary>
    void AddPermission(string senderToken, string receiverToken);

    /// <summary>
    /// Returns true if a permission exists between the two clients in either direction, false otherwise.
    /// </summary>
    bool HasPermissionEitherWay(string clientTokenA, string clientTokenB);

    /// <summary>
    /// Registers the two clients as connected, in either order.
    /// Returns false if they already are.
    /// </summary>
    bool TryAddConnectedPair(string clientTokenA, string clientTokenB);

    /// <summary>
    /// Returns true if the two clients were connected and the pair got removed, false otherwise.
    /// </summary>
    bool TryRemoveConnectedPair(string clientTokenA, string clientTokenB);

    bool AreConnected(string clientTokenA, string clientTokenB);

    /// <summary>
    /// Records that the claimant asks to resume its connection to the partner.
    /// If the partner asked the same before, removes that claim and registers the two as connected.
    /// </summary>
    ResumeClaim ClaimResume(string claimantToken, string partnerToken);

    /// <summary>
    /// Drops every permission, connected pair and resume claim the client takes part in.
    /// Returns the lowercase tokens of its former connection partners.
    /// </summary>
    IReadOnlyList<string> RemoveClient(string clientToken);
}
