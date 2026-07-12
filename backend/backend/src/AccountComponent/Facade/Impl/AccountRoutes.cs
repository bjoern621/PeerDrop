using backend.AccountComponent.Facade.Api;
using backend.AccountComponent.Logic.Api;

namespace backend.AccountComponent.Facade.Impl;

public class AccountRoutes : IAccountRoutes
{
    public void RegisterRoutes(WebApplication app)
    {
        app.MapPost("/accounts", (IAccountCreationHandler handler, HttpContext context) =>
            handler.HandleAccounts(context));
        app.MapPost("/login", (IAccountLoginHandler loginHandler, HttpContext context) =>
            loginHandler.HandleLogin(context));
        app.MapPost("/logout", (IAccountLoginHandler loginHandler, HttpContext context) =>
            loginHandler.HandleLogout(context));
        app.MapGet("/me", (IAccountLoginHandler loginHandler, HttpContext context) =>
            loginHandler.HandleGetCurrentUser(context));
        app.MapGet("/me/status", (IAccountLoginHandler loginHandler, HttpContext context) =>
            loginHandler.HandleGetLoggedInStatus(context));
    }
}