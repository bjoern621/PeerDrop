using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace backend.tests.TestUtils;

public static class HttpUtil
{
    public static HttpContext CreateMockHttpContext(object obj)
    {
        var json = JsonSerializer.Serialize(obj);
        var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));

        var context = new DefaultHttpContext
        {
            Request =
            {
                Body = stream
            }
        };
        context.Request.Body.Seek(0, SeekOrigin.Begin);
        return context;
    }
}
