using Microsoft.AspNetCore.WebSockets;
using backend.AccountCompoment.Dataaccess.Api.Repo;
using backend.AccountCompoment.Dataaccess.Impl;
using backend.AccountCompoment.Facade.Api;
using backend.AccountCompoment.Facade.Impl;
using backend.AccountCompoment.Logic.Api;
using backend.AccountCompoment.Logic.Impl;
using backend.CommonComponent;
using backend.SignalingComponent.Facade.Api;
using backend.SignalingComponent.Facade.Impl;
using backend.SignalingComponent.Logic.Api;
using backend.SignalingComponent.Logic.Impl;
using backend.WebSocketComponent.Common.DTOs;
using backend.WebSocketComponent.Facade.Api;
using backend.WebSocketComponent.Facade.Impl;
using backend.WebSocketComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Impl;

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
                     .AllowCredentials() // Required to allow session cookies
        ));

builder.Services.AddWebSockets(options => { });
builder.Services.AddSingleton<IWebSocketRoutes, WebSocketRoutes>();
builder.Services.AddSingleton<IWebSocketHandler, WebSocketHandler>();
builder.Services.AddSingleton<ISignalingFacade, SignalingFacade>();
builder.Services.AddSingleton<ISignalingService, SignalingService>();
builder.Services.AddSingleton<IAccountRoutes, AccountRoutes>();
builder.Services.AddScoped<IAccountHandler, AccountHandler>();
builder.Services.AddScoped<IAccountRepository, AccountRepository>();

builder.Services.AddDistributedMemoryCache(); // For in-memory session storage
builder.Services.AddSession(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.IdleTimeout = TimeSpan.FromDays(1); // Adjust as needed
});

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment()) app.MapOpenApi();

app.UseCors(corsAllowFrontendOrigin);

app.UseSession(); // Enables session handling on incoming requests

app.UseWebSockets();

var webSocketRoutes = app.Services.GetRequiredService<IWebSocketRoutes>();
webSocketRoutes.RegisterRoutes(app);
var signalingFacade = app.Services.GetRequiredService<ISignalingFacade>();
signalingFacade.SubscribeToMessageHandlers();
var accountRoutes = app.Services.GetRequiredService<IAccountRoutes>();
accountRoutes.RegisterRoutes(app);
var webSocketHandler = app.Services.GetRequiredService<IWebSocketHandler>();
webSocketHandler.SubscribeToMessageType<TestMessage>("test", async (clientId, message) =>
{
    Console.WriteLine($"Received message from client {clientId}: {message.Message}");

    TestMessage response = new()
    {
        Message = "Hallo vom Server!"
    };

    await webSocketHandler.SendMessage(clientId, response);
});

app.Run();