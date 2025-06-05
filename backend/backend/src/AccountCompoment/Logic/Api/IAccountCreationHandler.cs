namespace backend.AccountCompoment.Logic.Api;
public interface IAccountCreationHandler
{
    public Task<IResult> HandleAccounts(HttpContext context);
}