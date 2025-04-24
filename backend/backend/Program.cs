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
            policyBuilder.WithOrigins("http://192.168.1.1:1234")));


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

app.Run();

internal record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}