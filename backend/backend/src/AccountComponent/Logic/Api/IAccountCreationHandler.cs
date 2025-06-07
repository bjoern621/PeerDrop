namespace backend.AccountComponent.Logic.Api;
public interface IAccountCreationHandler
{
    public Task<IResult> HandleAccounts(HttpContext context);
}