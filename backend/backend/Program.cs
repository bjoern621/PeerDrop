const string corsAllowDevelopmentOrigin = "corsAllowDevelopmentOrigin";
const string corsAllowProductionOrigin = "corsAllowProductionOrigin";

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

if (builder.Environment.IsDevelopment())
    builder.Services.AddCors(options => options.AddPolicy(
        corsAllowDevelopmentOrigin,
        policyBuilder =>
            policyBuilder.WithOrigins("http://localhost:5173")));
else if (builder.Environment.IsProduction())
    builder.Services.AddCors(options => options.AddPolicy(
        corsAllowProductionOrigin,
        policyBuilder =>
            policyBuilder.WithOrigins("https://peerdrop.bjoernblessin.de")));


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseCors(corsAllowDevelopmentOrigin);
}
else if (app.Environment.IsProduction())
{
    app.UseCors(corsAllowProductionOrigin);
}


string[] summaries =
[
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
];

/*
 * Standard, Happy-Path Beispielresponse
 */
app.MapGet("/weatherforecast", () =>
    {
        var forecast = Enumerable.Range(1, 5).Select(index =>
                new WeatherForecast
                (
                    DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                    Random.Shared.Next(-20, 55),
                    summaries[Random.Shared.Next(summaries.Length)]
                ))
            .ToArray();
        return forecast;
    })
    .WithName("GetWeatherForecast");

/*
 * Erzeugt Fehler: Im Client wird fetch() fehlschlagen (err1)
 */
app.MapGet("/weatherforecast1", (HttpContext context) =>
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
app.MapGet("/weatherforecast5", () => (string[]) ["1", "2"]);

app.Run();

internal record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}