namespace backend.MessagingComponent.Dataaccess.Api;

/// <summary>
/// A transfer offer that the receiver has not answered yet. Tokens are lowercase.
/// </summary>
public record PendingOffer(string OfferId, string SenderToken, string ReceiverToken);
