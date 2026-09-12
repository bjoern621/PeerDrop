using System.Security.Claims;
using System.Text.RegularExpressions;
using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Common.Exception;
using backend.DeviceComponent.Common.Validators;
using backend.DeviceComponent.Dataaccess.Api.Entity;
using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.DeviceComponent.Logic.Api;

namespace backend.DeviceComponent.Logic.Impl;

public class DeviceHandler(IDeviceRepository repo, IDeviceService _deviceService) : IDeviceHandler
{
    readonly string cookieDomain =
        Environment.GetEnvironmentVariable("COOKIE_DOMAIN")
        ?? throw new ApplicationException("COOKIE_DOMAIN not set");

    /// <summary>
    /// Reads the account id of the authenticated principal. Returns false for anonymous requests.
    /// </summary>
    private static bool TryGetAccountId(HttpContext context, out int accountId)
    {
        var idClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(idClaim, out accountId);
    }

    public async Task<IResult> RegisterDeviceAsync(HttpContext context)
    {
        if (!TryGetAccountId(context, out var accountId))
        {
            return Results.Unauthorized();
        }

        // Retrieve the display name from the User-Agent header (you can extract specific info if needed)
        string displayNameRaw = context.Request.Headers["User-Agent"].ToString();
        string displayName = GetBrowserAndOs(displayNameRaw);

        // Reuse the UUID from an existing cookie so the device keeps its identity across accounts.
        // The cookie is only set once and never overwritten.
        var hasValidCookie = Guid.TryParse(context.Request.Cookies["deviceUuid"], out var deviceUuid);
        if (!hasValidCookie)
        {
            deviceUuid = Guid.NewGuid();
        }

        var existingDevice = await repo.GetDeviceByUuidAsync(deviceUuid, accountId);
        if (existingDevice != null)
        {
            // The account already registered this device
            return Results.Ok(new DeviceRegisterDto { uuid = deviceUuid });
        }

        // Create a new device object to save in the repository
        var device = Device.Of(displayName, deviceUuid, accountId);
        // Save the device to the repository (database)
        await repo.SaveDeviceAsync(device);

        if (!hasValidCookie)
        {
            context.Response.Cookies.Append(
                "deviceUuid",
                deviceUuid.ToString(),
                new CookieOptions
                {
                    HttpOnly = false, // Client needs to access this cookie via JavaScript to send heartbeats and check if the local device is registered; THIS ALSO MEANS THAT THE COOKIE IS NOT SECURE (you may validate the cookie on the server side by using the auth session token)
                    IsEssential = true,
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTimeOffset.UtcNow.AddYears(5),
                    Domain = cookieDomain,
                }
            );
        }

        _deviceService.SendDeviceChangedMessage(
            accountId,
            "added",
            deviceUuid,
            displayName,
            "offline"
        );

        // Return the UUID in the response so that it can be stored in the frontend cookie
        return Results.Ok(new DeviceRegisterDto { uuid = deviceUuid });
    }

    private static string GetBrowserAndOs(string userAgent)
    {
        // Extract OS from the User-Agent string (between parentheses)
        var osRegex = new Regex(@"\(([^)]+)\)");
        var osMatch = osRegex.Match(userAgent);
        string os = osMatch.Success ? osMatch.Groups[1].Value : "Unknown OS";

        // Simplifying OS extraction to just the OS name, e.g., "Windows NT"
        if (os.Contains("Windows"))
        {
            os = "Windows";
        }
        else if (os.Contains("Mac OS"))
        {
            os = "Mac OS";
        }
        else if (os.Contains("Linux"))
        {
            os = "Linux";
        }
        else if (os.Contains("Android"))
        {
            os = "Android";
        }
        else if (os.Contains("iPhone") || os.Contains("iPad") || os.Contains("iOS"))
        {
            os = "iOS";
        }
        else
        {
            os = "Unknown OS";
        }

        // Extract Browser (simplified for common browsers)
        string browser = "Unknown Browser";

        // Check for Firefox
        if (userAgent.Contains("Firefox"))
        {
            browser = "Firefox";
        }
        // Check for Chrome (excluding Safari)
        else if (userAgent.Contains("Chrome") && !userAgent.Contains("Safari"))
        {
            browser = "Chrome";
        }
        // Check for Safari (excluding Chrome)
        else if (userAgent.Contains("Safari") && !userAgent.Contains("Chrome"))
        {
            browser = "Safari";
        }
        // Check for Edge
        else if (userAgent.Contains("Edg"))
        {
            browser = "Edge";
        }

        return $"{os} {browser}";
    }

    public async Task<IResult> GetDevicesByUserAsync(HttpContext context)
    {
        if (!TryGetAccountId(context, out var parsedAccountId))
        {
            return Results.Unauthorized();
        }

        var devices = await repo.GetAllDisplayNamesForAccountAsync(parsedAccountId);

        var deviceUuid = context.Request.Cookies["deviceUuid"];
        if (Guid.TryParse(deviceUuid, out var deviceGuid))
        {
            var registeredForAccount = devices.Any(d => d.Uuid == deviceGuid);
            if (!registeredForAccount)
            {
                // Another account may still have the device registered, in that case the cookie must stay.
                var accountIds = await repo.GetAccountIdsByDeviceUuidAsync(deviceGuid);
                if (accountIds.Count == 0)
                {
                    // Cookie löschen, weil das Gerät nicht mehr existiert
                    context.Response.Cookies.Append(
                        "deviceUuid",
                        "",
                        new CookieOptions
                        {
                            Expires = DateTimeOffset.UtcNow.AddDays(-1),
                            HttpOnly = false,
                            IsEssential = true,
                            SameSite = SameSiteMode.Lax,
                            Path = "/",
                            Domain = cookieDomain,
                        }
                    );
                }
            }
        }

        var deviceResponse = new DeviceResponseDTO
        {
            Devices =
            [
                .. devices.Select(device => new DeviceLoginDto
                {
                    Uuid = device.Uuid,
                    DisplayName = device.DisplayName,
                    Status = _deviceService.GetDeviceStatus(device.Uuid),
                }),
            ],
        };
        return Results.Ok(deviceResponse); // Return the devices or relevant data
    }

    public async Task<IResult> DeleteDeviceAsync(HttpContext context)
    {
        if (!TryGetAccountId(context, out var parsedAccountId))
        {
            return Results.Unauthorized();
        }

        // Read device UUID from request body
        var deviceGuid = await context.Request.ReadFromJsonAsync<Guid>();
        if (deviceGuid == Guid.Empty)
        {
            return Results.BadRequest("Device UUID is required.");
        }

        // Prüfen, ob das Device für diesen Account registriert ist
        var device = await repo.GetDeviceByUuidAsync(deviceGuid, parsedAccountId);
        if (device == null)
        {
            return Results.Unauthorized();
        }

        var deviceDisplayName = device.GetDisplayName(); // TODO

        // Only the link of the acting account is removed, other accounts keep the device
        await repo.DeleteDeviceAsync(parsedAccountId, deviceGuid);
        _deviceService.HandleDeviceDelete(deviceGuid, parsedAccountId, "offline");

        _deviceService.SendDeviceChangedMessage(
            parsedAccountId,
            "removed",
            deviceGuid,
            deviceDisplayName,
            "offline"
        );

        return Results.Ok("Device deleted successfully.");
    }

    public async Task<IResult> RenameDeviceAsync(HttpContext context)
    {
        if (!TryGetAccountId(context, out var parsedAccountId))
        {
            return Results.Unauthorized();
        }

        // Read device UUID and new display name from request body
        var renameDto = await context.Request.ReadFromJsonAsync<DeviceRenameDto>();
        if (renameDto == null || renameDto.Uuid == Guid.Empty)
        {
            return Results.BadRequest("Device UUID is required.");
        }

        var displayName = renameDto.DisplayName.Trim();
        try
        {
            DisplayNameValidator.ValidateDisplayNameFormat(displayName);
        }
        catch (InvalidDisplayNameException e)
        {
            return Results.BadRequest(e.Message);
        }

        // Prüfen, ob das Device für diesen Account registriert ist
        var device = await repo.GetDeviceByUuidAsync(renameDto.Uuid, parsedAccountId);
        if (device == null)
        {
            return Results.Unauthorized();
        }

        // Proceed with renaming the device
        await repo.RenameDeviceAsync(parsedAccountId, renameDto.Uuid, displayName);

        _deviceService.SendDeviceChangedMessage(
            parsedAccountId,
            "renamed",
            renameDto.Uuid,
            displayName,
            _deviceService.GetDeviceStatus(renameDto.Uuid)
        );

        return Results.Ok("Device renamed successfully.");
    }
}
