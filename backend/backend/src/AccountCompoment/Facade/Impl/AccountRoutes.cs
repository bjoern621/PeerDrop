using backend.AccountCompoment.Facade.Api;
using backend.AccountCompoment.Logic.Api;

namespace backend.AccountCompoment.Facade.Impl;

public class AccountRoutes : IAccountRoutes
{
    public void RegisterRoutes(WebApplication app)
    {
        app.MapPost("/accounts", (IAccountHandler handler, HttpContext context) =>
            handler.HandleAccounts(context));
        app.MapPost("/login", (IAccountHandler handler, HttpContext context) =>
            handler.HandleLogin(context));
        app.MapGet("/me", (IAccountHandler handler, HttpContext context) =>
            handler.HandleGetCurrentUser(context));
        app.MapGet("/me/status", (IAccountHandler handler, HttpContext context) =>
            handler.HandleGetLoggedInStatus(context));
    }
}