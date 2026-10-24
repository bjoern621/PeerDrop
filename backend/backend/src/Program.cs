using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Dataaccess.Impl;
using backend.AccountComponent.Facade.Api;
using backend.AccountComponent.Facade.Impl;
using backend.AccountComponent.Logic.Api;
using backend.AccountComponent.Logic.Impl;
using backend.CommonComponent;
using backend.ConnectionComponent.Dataaccess.Api;
using backend.ConnectionComponent.Dataaccess.Impl;
using backend.ConnectionComponent.Facade.Api;
using backend.ConnectionComponent.Facade.Impl;
using backend.ConnectionComponent.Logic.Api;
using backend.ConnectionComponent.Logic.Impl;
using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.DeviceComponent.Dataaccess.Impl;
using backend.DeviceComponent.Facade.Api;
using backend.DeviceComponent.Facade.Impl;
using backend.DeviceComponent.Logic.Api;
using backend.DeviceComponent.Logic.Impl;
using backend.LanComponent.Facade.Api;
using backend.LanComponent.Facade.Impl;
using backend.LanComponent.Logic.Api;
using backend.LanComponent.Logic.Impl;
using backend.MessagingComponent.Dataaccess.Api;
using backend.MessagingComponent.Dataaccess.Impl;
using backend.MessagingComponent.Facade.Api;
using backend.MessagingComponent.Facade.Impl;
using backend.MessagingComponent.Logic.Api;
using backend.MessagingComponent.Logic.Impl;
using backend.SignalingComponent.Facade.Api;
using backend.SignalingComponent.Facade.Impl;
using backend.SignalingComponent.Logic.Api;
using backend.SignalingComponent.Logic.Impl;
using backend.TelemetryComponent.Dataaccess.Api;
using backend.TelemetryComponent.Dataaccess.Impl;
using backend.TelemetryComponent.Facade.Api;
using backend.TelemetryComponent.Facade.Impl;
using backend.TelemetryComponent.Logic.Api;
using backend.TelemetryComponent.Logic.Impl;
using backend.WebSocketComponent.Facade.Api;
using backend.WebSocketComponent.Facade.Impl;
using backend.WebSocketComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Impl;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.WebSockets;
using OpenTelemetry.Metrics;

const string corsAllowFrontendOrigin = "corsAllowFrontendOrigin";

var builder = WebApplication.CreateBuilder(args);
builder.Logging.AddConsole();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var _cookieDomain =
    Environment.GetEnvironmentVariable("COOKIE_DOMAIN")
    ?? throw new ApplicationException("COOKIE_DOMAIN not set");

var frontendOrigin =
    Environment.GetEnvironmentVariable("FRONTEND_ORIGIN")
    ?? throw new ApplicationException("FRONTEND_ORIGIN not set");

builder.Services.AddCors(options =>
    options.AddPolicy(
        corsAllowFrontendOrigin,
        policyBuilder =>
            policyBuilder
                .WithOrigins(frontendOrigin)
                .WithHeaders("Content-Type", "User-Agent", "Authorization")
                .WithExposedHeaders("Location")
                .AllowCredentials() // Required to allow session cookies
                .WithMethods("GET", "POST", "DELETE", "PATCH")
    )
);

var host =
    Environment.GetEnvironmentVariable("DB_HOST")
    ?? throw new ApplicationException("DB_HOST not set");
var user =
    Environment.GetEnvironmentVariable("DB_USERNAME")
    ?? throw new ApplicationException("DB_USERNAME not set");
var pass =
    Environment.GetEnvironmentVariable("DB_PASSWORD")
    ?? throw new ApplicationException("DB_PASSWORD not set");
var database =
    Environment.GetEnvironmentVariable("DB_DATABASE_NAME")
    ?? throw new ApplicationException("DB_DATABASE_NAME not set");

var connString = $"Host={host};Username={user};Password={pass};Database={database}";
var dataSource = Npgsql.NpgsqlDataSource.Create(connString);
builder.Services.AddSingleton(dataSource);

// Both unset in local development, where peers on one machine reach each other directly.
var turnHost = Environment.GetEnvironmentVariable("TURN_HOST");
var turnSecret = Environment.GetEnvironmentVariable("TURN_SECRET");
if (turnHost != null && turnSecret == null)
    throw new ApplicationException("TURN_HOST set without TURN_SECRET");
builder.Services.AddSingleton<IIceServerProvider>(new IceServerProvider(turnHost, turnSecret, TimeProvider.System));

builder.Services.Configure<ForwardedHeadersOptions>(options =>
    TrustedProxies.Configure(options, Environment.GetEnvironmentVariable(TrustedProxies.EnvironmentVariable))
);

// Unset in local development, where an exporter would retry localhost without end.
if (Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT") != null)
{
    builder
        .Services.AddOpenTelemetry()
        .WithMetrics(metrics =>
            metrics
                .AddMeter(UsageMetrics.MeterName, "Microsoft.AspNetCore.Hosting", "Microsoft.AspNetCore.Server.Kestrel")
                .AddOtlpExporter()
        );
}

builder.Services.AddWebSockets(options => { });
builder.Services.AddSingleton<IWebSocketRoutes, WebSocketRoutes>();
builder.Services.AddSingleton<IWebSocketHandler, WebSocketHandler>();
builder.Services.AddSingleton<ISignalingFacade, SignalingFacade>();
builder.Services.AddSingleton<ISignalingService, SignalingService>();
builder.Services.AddSingleton<IAccountRoutes, AccountRoutes>();
builder.Services.AddSingleton<IDeviceRoutes, DeviceRoutes>();
builder.Services.AddSingleton<IDeviceWebsocketMessages, DeviceWebsocketMessages>();
builder.Services.AddSingleton<IDeviceService, DeviceService>();
builder.Services.AddSingleton<ILanDiscoveryService, LanDiscoveryService>();
builder.Services.AddSingleton<ILanEventSubscriptions, LanEventSubscriptions>();
builder.Services.AddSingleton<IConnectionWebsocketMessages, ConnectionWebsocketMessages>();
builder.Services.AddSingleton<IPeerConnectionService, PeerConnectionService>();
builder.Services.AddSingleton<IConnectionInitiationService, ConnectionInitiationService>();
builder.Services.AddSingleton<IPairRepository, PairRepository>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IMessagingWebsocketMessages, MessagingWebsocketMessages>();
builder.Services.AddSingleton<ITokenLookupService, TokenLookupService>();
builder.Services.AddSingleton<ITextService, TextService>();
builder.Services.AddSingleton<ITransferOfferService, TransferOfferService>();
builder.Services.AddSingleton<IAbuseGuard, AbuseGuard>();
builder.Services.AddSingleton<IPendingOfferRepository, PendingOfferRepository>();
builder.Services.AddSingleton<IUsageMetrics, UsageMetrics>();
builder.Services.AddSingleton<IUsageCountRepository, UsageCountRepository>();
builder.Services.AddSingleton<ITelemetryWebsocketMessages, TelemetryWebsocketMessages>();
builder.Services.AddScoped<IAccountLoginHandler, AccountLoginHandler>();
builder.Services.AddScoped<IAccountCreationHandler, AccountCreationHandler>();
builder.Services.AddScoped<IAccountRepository, AccountRepository>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IAccountSignInService, AccountSignInService>();
builder.Services.AddScoped<ISecurityStampValidator, SecurityStampValidator>();
builder.Services.AddScoped<IDeviceHandler, DeviceHandler>();
builder.Services.AddScoped<IDeviceRepository, DeviceRepository>();

// The data protection key ring encrypts the auth cookies. It is stored in the
// database so cookies stay valid across backend restarts and deployments and the
// keys share the lifecycle of the account data they protect.
builder.Services.AddDataProtection().SetApplicationName("PeerDrop");
builder.Services.Configure<KeyManagementOptions>(options =>
    options.XmlRepository = new PostgresXmlRepository(dataSource)
);

builder
    .Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.ExpireTimeSpan = TimeSpan.FromDays(365);
        options.SlidingExpiration = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        // Development runs on plain http (localhost), production must only send the cookie over https
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        // JSON API: return status codes instead of redirecting to a login page
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
        options.Events.OnValidatePrincipal = context =>
            context
                .HttpContext.RequestServices.GetRequiredService<ISecurityStampValidator>()
                .ValidateAsync(context);
    });

var app = builder.Build();

// First, so every later step sees the client address instead of the proxy's.
app.UseForwardedHeaders();

app.UseMiddleware<ExceptionHandlingMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors(corsAllowFrontendOrigin);

app.UseAuthentication();

app.UseWebSockets();

var webSocketRoutes = app.Services.GetRequiredService<IWebSocketRoutes>();
webSocketRoutes.RegisterRoutes(app);
var signalingFacade = app.Services.GetRequiredService<ISignalingFacade>();
signalingFacade.SubscribeToMessageHandlers();
var accountRoutes = app.Services.GetRequiredService<IAccountRoutes>();
accountRoutes.RegisterRoutes(app);
var deviceRoutes = app.Services.GetRequiredService<IDeviceRoutes>();
await deviceRoutes.RegisterRoutes(app);
var deviceWebsocketMessages = app.Services.GetRequiredService<IDeviceWebsocketMessages>();
deviceWebsocketMessages.SubscribeToMessageHandlers();
var connectionWSMessages = app.Services.GetRequiredService<IConnectionWebsocketMessages>();
connectionWSMessages.SubscribeToMessageHandlers();
var messagingWebsocketMessages = app.Services.GetRequiredService<IMessagingWebsocketMessages>();
messagingWebsocketMessages.SubscribeToMessageHandlers();
var lanEventSubscriptions = app.Services.GetRequiredService<ILanEventSubscriptions>();
lanEventSubscriptions.SubscribeToEvents();
var telemetryWebsocketMessages = app.Services.GetRequiredService<ITelemetryWebsocketMessages>();
telemetryWebsocketMessages.SubscribeToMessageHandlers();

app.Run();
