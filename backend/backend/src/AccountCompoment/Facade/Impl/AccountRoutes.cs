using backend.AccountCompoment.Facade.Api;
using backend.AccountCompoment.Logic.Api;

namespace backend.AccountCompoment.Facade.Impl;

public class AccountRoutes : IAccountRoutes
{
    public void RegisterRoutes(WebApplication app)
    {
        app.MapPost("/accounts", (IAccountHandler handler, HttpContext context) =>
            handler.HandleAccounts(context));
    }
}