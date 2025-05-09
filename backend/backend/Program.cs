using System.Net.WebSockets;
using System.Text.Json;
using backend;
using backend.endpoints.websocket;
using Microsoft.AspNetCore.WebSockets;
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
        policyBuilder.WithOrigins(frontendOrigin)));

builder.Services.AddWebSockets(options => { });

var app = builder.Build();

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

        await using var cmd = dataSource.CreateCommand("INSERT INTO users (display_name) VALUES ('testname')");
        await cmd.ExecuteNonQueryAsync();


        return forecast;
    })
    .WithName("GetWeatherForecast");


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
    Console.WriteLine($"Received message from client {clientId}: {message.Nachricht}");

    TypedMessage<TestMessage> response = new()
    {
        Type = "test",
        Msg = new TestMessage
        {
            Nachricht = "Hallo vom Server!"
        }
    };

    await WebSocketHandler.SendMessage(clientId, response);
});

const string REMOTE_TOKEN_MESSAGE_TYPE = "remote-token";

WebSocketHandler.SubscribeToMessageType<RemoteTokenMessage>(REMOTE_TOKEN_MESSAGE_TYPE, async (clientId, message) =>
    {
        Console.WriteLine($"Raw message received from {clientId}: {JsonSerializer.Serialize(message)}");
        string remoteToken = message.RemoteToken;

        TypedMessage<RemoteTokenMessage> response = new()
        {

            Type = REMOTE_TOKEN_MESSAGE_TYPE,
            Msg = new RemoteTokenMessage
            {
                RemoteToken = clientId
            }
        };

        await WebSocketHandler.SendMessage(remoteToken, response);
        Console.WriteLine($"Send raw message to {remoteToken}: {JsonSerializer.Serialize(response)}");
    }
    );

app.Run();

internal record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}