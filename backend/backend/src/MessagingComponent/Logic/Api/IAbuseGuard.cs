namespace backend.MessagingComponent.Logic.Api;

/// <summary>
/// Enforces the server-side limits against token guessing and spam, in memory.
/// Tokens compare case-insensitively.
/// Can be called concurrently.
/// </summary>
public interface IAbuseGuard
{
    /// <summary>
    /// Returns the time until the requester may miss on unknown tokens again, or null if it may.
    /// The budget counts per requester token and per requester IP. The longer lock of the two applies.
    /// </summary>
    TimeSpan? GetUnknownTokenLock(string requesterToken, string? requesterIp);

    /// <summary>
    /// Counts a lookup or send to a token that is not online, against both the requester token and the requester IP.
    /// Returns the time until the lock ends if either budget is locked afterwards, null otherwise.
    /// </summary>
    TimeSpan? RecordUnknownTokenMiss(string requesterToken, string? requesterIp);

    /// <summary>
    /// Returns the time until the sender may send its next text, or null if it may now.
    /// </summary>
    TimeSpan? GetTextWait(string senderToken);

    /// <summary>
    /// Returns true if the receiver got as many texts within the window as it takes, false otherwise.
    /// </summary>
    bool IsReceiverTextCapReached(string receiverToken);

    /// <summary>
    /// Takes a token from the sender's text bucket and counts the text against the receiver's cap.
    /// </summary>
    void RecordTextDelivered(string senderToken, string receiverToken);

    /// <summary>
    /// Counts an offer against the sender's offer cap.
    /// Returns null if the offer fits the cap. Otherwise returns the time until it fits and counts nothing.
    /// </summary>
    TimeSpan? TryRecordOffer(string senderToken);

    /// <summary>
    /// Drops all state of a disconnected client. State per IP expires on its own.
    /// </summary>
    void ForgetToken(string clientToken);
}
