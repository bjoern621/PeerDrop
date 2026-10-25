namespace backend.AccountComponent.Logic.Api;

public interface IChosenClientTokenHandler
{
    /// <summary>
    /// Stores the token from the request body as the client token that the signed-in account receives on every connect.
    /// The token may arrive in any casing and gets stored in lowercase.
    /// Returns 200 with the stored token and whether a connection holds it at the moment.
    /// Returns 401 without a session and 400 for a token outside a-z and 0-9 or of another length.
    /// </summary>
    public Task<IResult> HandleSetChosenClientToken(HttpContext context);

    /// <summary>
    /// Returns the chosen client token of the signed-in account.
    /// Returns null for an anonymous request and for an account without a chosen token.
    /// </summary>
    public Task<string?> GetChosenClientTokenAsync(HttpContext context);
}
