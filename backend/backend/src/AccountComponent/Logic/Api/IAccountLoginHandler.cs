namespace backend.AccountComponent.Logic.Api;

public interface IAccountLoginHandler
{
    public Task<IResult> HandleLogin(HttpContext context);

    public Task<IResult> HandleLogout(HttpContext context);

    public Task<IResult> HandleRefresh(HttpContext context);

    public Task<IResult> HandleGetCurrentUser(HttpContext context);

    public Task<IResult> HandleGetLoggedInStatus(HttpContext context);
}
