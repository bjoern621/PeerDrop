using backend.AccountComponent.Common.Api.Exception;

namespace backend.CommonComponent;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unexpected error occurred.");
            await HandleExceptionAsync(context, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        // If the response has already started (e.g., for a WebSocket connection),
        // we can't send a new response. Just log the error and exit.
        if (context.Response.HasStarted)
        {
            _logger.LogWarning("Could not write error response. Response has already started, likely due to a WebSocket exception.");
            return Task.CompletedTask;
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = exception switch
        {
            InvalidPasswordFormatException => StatusCodes.Status400BadRequest,
            InvalidUsernameFormatException => StatusCodes.Status400BadRequest,
            //NotFoundException => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status500InternalServerError
        };

        var response = new { message = exception.Message };
        return context.Response.WriteAsJsonAsync(response);
    }
}