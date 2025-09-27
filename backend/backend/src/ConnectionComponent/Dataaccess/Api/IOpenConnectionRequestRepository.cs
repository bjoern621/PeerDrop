using System.Diagnostics.CodeAnalysis;

namespace backend.ConnectionComponent.Dataaccess.Api;

public interface IOpenConnectionRequestRepository
{
    /// <summary>
    /// Adds a new open connection request from requesterToken to targetToken.
    /// If there is already an open request from requesterToken, it will be silently replaced.
    /// </summary>
    void Add(string requesterToken, string targetToken);
    /// <summary>
    /// Removes an open connection request made by the requesterToken.
    /// </summary>
    /// <returns>true if the object was removed successfully; otherwise, false</returns>
    bool TryRemove(string requesterToken, [MaybeNullWhen(false)] out string targetToken);
    /// <summary>
    /// Finds and removes all requesters that have an open connection request targeting the specified targetToken.
    /// </summary>
    IEnumerable<string> FindAndRemoveRequestersForTarget(string targetToken);
}
