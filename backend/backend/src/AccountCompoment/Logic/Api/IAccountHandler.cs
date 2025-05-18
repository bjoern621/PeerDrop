namespace backend.AccountCompoment.Logic.Api;

public interface IAccountHandler
{
    public Task<IResult> HandleAccounts(HttpContext context);
    
    public  Task<IResult> HandleLogin(HttpContext context);
}