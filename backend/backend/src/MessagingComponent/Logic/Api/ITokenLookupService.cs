using backend.MessagingComponent.Common.Api.DTOs;

namespace backend.MessagingComponent.Logic.Api;

public interface ITokenLookupService
{
    /// <summary>
    /// Stores the client's public key, replacing an earlier one.
    /// Ignored if the key is longer than 200 characters or not valid base64.
    /// </summary>
    Task HandlePublicKey(string clientToken, PublicKeyMessage message);

    /// <summary>
    /// Answers with a token-status for the requested token or own device.
    /// A token that is not online costs a try of the requester's unknown-token budget.
    /// While that budget is locked, a token lookup answers offline without checking.
    /// A device lookup finds a device registered to the requester's account with an online heartbeat and never costs budget.
    /// Ignored unless the message carries exactly one of token and device UUID.
    /// </summary>
    Task HandleTokenLookup(string clientToken, TokenLookupMessage message);

    /// <summary>
    /// Tells every client whose last online lookup found this client that it went offline.
    /// </summary>
    Task HandleClientDisconnected(string clientToken);
}
