namespace backend.AccountComponent.Logic.Api;

public interface IAccountSignInService
{
    /// <summary>
    /// Issues a persistent authentication cookie for the given account.
    /// </summary>
    Task SignInAsync(HttpContext context, int accountId, Guid securityStamp);
}
