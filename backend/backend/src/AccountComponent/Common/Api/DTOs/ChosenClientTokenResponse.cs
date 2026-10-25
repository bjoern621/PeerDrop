namespace backend.AccountComponent.Common.Api.DTOs;

/// <param name="InUse">A connection holds the token. Connects of this account get a random token until it lets go.</param>
public record ChosenClientTokenResponse(string Token, bool InUse);
