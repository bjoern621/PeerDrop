using System.Security.Claims;
using System.Text;
using System.Text.Json;
using backend.AccountComponent.Common.Api;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace backend.tests.TestUtils;

public static class HttpUtil
{
    public static HttpContext CreateMockHttpContext(object obj)
    {
        var json = JsonSerializer.Serialize(obj);
        var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));

        var services = new ServiceCollection();
        services.AddSingleton<IAuthenticationService>(new FakeAuthenticationService());

        var context = new DefaultHttpContext
        {
            Request =
            {
                Body = stream
            },
            RequestServices = services.BuildServiceProvider()
        };
        context.Request.Body.Seek(0, SeekOrigin.Begin);
        return context;
    }

    /// <summary>
    /// Marks the context as authenticated with a cookie-style principal for the given account.
    /// </summary>
    public static void SetAuthenticatedUser(HttpContext context, int accountId, Guid? securityStamp = null)
    {
        var identity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, accountId.ToString()),
                new Claim(AuthClaims.SecurityStamp, (securityStamp ?? Guid.NewGuid()).ToString()),
            ],
            CookieAuthenticationDefaults.AuthenticationScheme
        );
        context.User = new ClaimsPrincipal(identity);
    }
}
