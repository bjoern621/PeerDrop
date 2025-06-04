using backend.AccountComponent.Facade.Api;
using backend.AccountComponent.Logic.Api;

namespace backend.AccountComponent.Facade.Impl;

public class AccountRoutes : IAccountRoutes
{
    public void RegisterRoutes(WebApplication app)
    {
        app.MapPost("/accounts", (IAccountHandler handler, HttpContext context) =>
            handler.HandleAccounts(context));
    }
}