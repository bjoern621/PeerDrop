using System.Security.Claims;
using System.Text.Json;
using backend.AccountComponent.Common.Api.DTOs;
using backend.AccountComponent.Dataaccess.Api.Repo;
using backend.AccountComponent.Logic.Api;
using backend.WebSocketComponent.Common.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.AccountComponent.Logic.Impl;

public class ChosenClientTokenHandler(IAccountRepository repo, IWebSocketHandler webSocketHandler) : IChosenClientTokenHandler
{
    public async Task<IResult> HandleSetChosenClientToken(HttpContext context)
    {
        if (!TryGetAccountId(context, out var accountId))
            return Results.Unauthorized();

        ChosenClientTokenDto? dto;
        try
        {
            dto = await context.Request.ReadFromJsonAsync<ChosenClientTokenDto>();
        }
        catch (JsonException)
        {
            return Results.BadRequest("Invalid JSON format.");
        }

        if (dto?.Token == null)
            return Results.BadRequest("Missing token.");

        var token = dto.Token.ToLowerInvariant();
        if (!ClientTokenFormat.IsValidChosenToken(token))
            return Results.BadRequest(
                $"A token takes {ClientTokenFormat.Length} characters from a-z and 0-9.");

        var updated = await repo.SetChosenClientTokenAsync(accountId, token);
        if (updated == 0)
            return Results.Unauthorized(); // Account no longer exists

        return Results.Ok(new ChosenClientTokenResponse(token, webSocketHandler.RemoteTokenExists(token)));
    }

    public async Task<string?> GetChosenClientTokenAsync(HttpContext context)
    {
        if (!TryGetAccountId(context, out var accountId))
            return null;

        return await repo.GetChosenClientTokenAsync(accountId);
    }

    private static bool TryGetAccountId(HttpContext context, out int accountId)
    {
        var idClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(idClaim, out accountId);
    }
}
