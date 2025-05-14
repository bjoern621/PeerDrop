using System.Net.WebSockets;
using backend;
using backend.endpoints.websocket;
using Microsoft.AspNetCore.WebSockets;
using backend;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

const string corsAllowFrontendOrigin = "corsAllowFrontendOrigin";

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var frontendOrigin = Environment.GetEnvironmentVariable("FRONTEND_ORIGIN") ??
                     throw new ApplicationException("FRONTEND_ORIGIN not set");

builder.Services.AddCors(options => options.AddPolicy(
    corsAllowFrontendOrigin,
    policyBuilder =>
        policyBuilder.WithOrigins(frontendOrigin)
                     .WithHeaders("Content-Type")
                     .WithExposedHeaders("Location")
        ));

builder.Services.AddWebSockets(options => { });

var app = builder.Build();


app.UseMiddleware<ExceptionHandlingMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment()) app.MapOpenApi();

app.UseCors(corsAllowFrontendOrigin);

app.UseWebSockets();

string[] summaries =
[
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
];

/*
 * Standard, Happy-Path Beispielresponse
 */
app.MapGet("/weatherforecast", async () =>
    {
        var forecast = Enumerable.Range(1, 5).Select(index =>
                new WeatherForecast
                (
                    DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                    Random.Shared.Next(-20, 55),
                    summaries[Random.Shared.Next(summaries.Length)]
                ))
            .ToArray();

        var host = Environment.GetEnvironmentVariable("DB_HOST") ??
                   throw new ApplicationException("DB_HOST not set");
        var username = Environment.GetEnvironmentVariable("DB_USERNAME") ??
                       throw new ApplicationException("DB_USERNAME not set");
        var password = Environment.GetEnvironmentVariable("DB_PASSWORD") ??
                       throw new ApplicationException("DB_PASSWORD not set");
        var databaseName = Environment.GetEnvironmentVariable("DB_DATABASE_NAME") ??
                           throw new ApplicationException("DB_DATABASE_NAME not set");

        var connectionString = $"Host={host};Username={username};Password={password};Database={databaseName}";
        await using var dataSource = NpgsqlDataSource.Create(connectionString);

        await using var cmd = dataSource.CreateCommand("INSERT INTO users (display_name,passwort) VALUES ('testname','aaa')");
        await cmd.ExecuteNonQueryAsync();


        return forecast;
    })
    .WithName("GetWeatherForecast");

/*
 * Custom Mappings für Account-Erstellung
 */
app.MapPost("/accounts", async ([FromBody] AccountCreateDto acc) =>
{
    var repo = new AccountRepository();
    var accountobj = await repo.GetByNameAsync(acc.DisplayName);

    if (accountobj == null) {
        // the account has not been created yet

        // throw Exceptions if the username or password is invalid
        Account.ValidateUsernameFormat(acc.DisplayName);
        Account.ValidatePasswordFormat(acc.Password);
        
        var account = Account.of(acc);
        
        var newId = await repo.SaveAsync(account);
        return Results.Created($"/users/{newId}", new { Id = newId });
    }

    // the username is already taken
    return Results.StatusCode(StatusCodes.Status409Conflict);
});

/*
 * Erzeugt Fehler: Im Client wird fetch() fehlschlagen (err1)
 */
app.MapGet("/weatherforecast1", context =>
{
    context.Abort();
    return Task.CompletedTask;
});

/*
 * Erzeugt Fehler: Im Client wird fetch() erfolgreich sein aber response.ok == false
 */
app.MapGet("/weatherforecast2", () => Results.StatusCode(StatusCodes.Status500InternalServerError));

/*
 * Erzeugt Fehler: Im Client wird response.json() fehlschlagen (err2)
 */
app.MapGet("/weatherforecast3", () => "abc");

/*
 * Erzeugt keinen Fehler, ist aber trotzdem nicht richtig: Dem Client werden invalide Daten gesendet (also kein WeatherForecast[], was eigentlich erwartet wird)
 */
app.MapGet("/weatherforecast4", () => Results.Json(new { data = "invalid" }));

/*
 * Erzeugt keinen Fehler, ist aber trotzdem nicht richtig: Dem Client werden invalide Daten gesendet (also kein WeatherForecast[], was eigentlich erwartet wird)
 */
app.MapGet("/weatherforecast5", () => (string[])["1", "2"]);

app.RegisterWebSocketRoutes();

WebSocketHandler.SubscribeToMessageType<TestMessage>("test", async (clientId, message) =>
{
    Console.WriteLine($"Received message from client {clientId}: {message.Message}");

    TypedMessage<TestMessage> response = new()
    {
        Type = "test",
        Msg = new TestMessage
        {
            Message = "Hallo vom Server!"
        }
    };

    await WebSocketHandler.SendMessage(clientId, response);
});

app.Run();

internal record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}