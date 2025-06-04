namespace backend.AccountComponent.Logic.Api;

public interface IAccountHandler
{
    public Task<IResult> HandleAccounts(HttpContext context);
}