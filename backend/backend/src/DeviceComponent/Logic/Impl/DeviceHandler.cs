using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Dataaccess.Api.Entity;
using backend.DeviceComponent.Logic.Api;
using backend.DeviceComponent.Dataaccess.Api.Repo;
using Microsoft.AspNetCore.Http.HttpResults;
using System.Text.RegularExpressions;
using backend.AccountComponent.Logic.Api;
using backend.AccountComponent.Common.Api.DTOs;

namespace backend.DeviceComponent.Logic.Impl;

public class DeviceHandler(IDeviceRepository repo, IAccountLoginHandler login, IDeviceService _deviceService) : IDeviceHandler
{
    public async Task<IResult> RegisterDeviceAsync(HttpContext context)
    {

        if (!context.Request.Cookies.TryGetValue(".AspNetCore.Session", out var sessionToken))
        {
            return Results.Unauthorized();
        }
        var result = await login.HandleGetCurrentUser(context);
        if (result is not Ok<LoginResponse>)
        {
            return Results.Unauthorized();
        }
        var accountIdCon = context.Session.GetString("UserId");
        if (!int.TryParse(accountIdCon, out var accountId))
        {
            return Results.BadRequest("Invalid account ID in session.");
        }

        // Retrieve the display name from the User-Agent header (you can extract specific info if needed)
        string displayNameRaw = context.Request.Headers["User-Agent"].ToString();
        string displayName = GetBrowserAndOs(displayNameRaw);

        // Generate a new UUID for the device
        var deviceUuid = Guid.NewGuid();

        // Create a new device object to save in the repository
        var device = Device.Of(displayName, deviceUuid, accountId);
        // Save the device to the repository (database)
        await repo.SaveDeviceAsync(device);

        context.Response.Cookies.Append("deviceUuid", deviceUuid.ToString(), new CookieOptions
        {
            HttpOnly = false, // Client needs to access this cookie via JavaScript to send heartbeats and check if the local device is registered; THIS ALSO MEANS THAT THE COOKIE IS NOT SECURE (you may validate the cookie on the server side by using the auth session token)
            IsEssential = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddYears(5)
        });

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
        // Check for session cookie
        if (!context.Request.Cookies.TryGetValue(".AspNetCore.Session", out var sessionToken))
        {
            return Results.Unauthorized();
        }
        var result = await login.HandleGetCurrentUser(context);
        if (result is not Ok<LoginResponse>)
        {
            return Results.Unauthorized();
        }

        // Access the session using the sessionToken or from the session store
        var accountId = context.Session.GetString("UserId");

        if (string.IsNullOrEmpty(accountId))
        {
            return Results.Unauthorized();
        }

        if (int.TryParse(accountId, out var parsedAccountId))
        {
            var deviceUuid = context.Request.Cookies["deviceUuid"];
            List<DeviceLoginDto>? devices;
            if (!string.IsNullOrEmpty(deviceUuid))
            {
                Guid deviceGuid;
                try
                {
                    deviceGuid = Guid.Parse(deviceUuid);
                }
                catch (FormatException)
                {
                    deviceGuid = Guid.Empty;
                }

                devices = await repo.GetAllDisplayNamesForAccountAsync(parsedAccountId, deviceGuid);
                var exists = devices.Any(d => d.Uuid == deviceGuid);
                if (!exists)
                {
                    // Cookie löschen, weil das Gerät nicht mehr existiert
                    context.Response.Cookies.Append("deviceUuid", "", new CookieOptions
                    {
                        Expires = DateTimeOffset.UtcNow.AddDays(-1),
                        HttpOnly = false,
                        IsEssential = true,
                        SameSite = SameSiteMode.Lax,
                        Path = "/"
                    });
                }
            }
            // Proceed with fetching the devices for the user
            else
            {
                devices = await repo.GetAllDisplayNamesForAccountAsync(parsedAccountId, Guid.Empty);
            }

            var deviceResponse = new DeviceResponseDTO
            {
                Devices = [.. devices.Select(device => new DeviceLoginDto
                {
                    Uuid = device.Uuid,
                    DisplayName = device.DisplayName,
                    IsCurrentDevice = device.IsCurrentDevice,
                    Status = _deviceService.GetDeviceStatus(device.Uuid)
                })]
            };
            return Results.Ok(deviceResponse);  // Return the devices or relevant data
        }
        else
        {
            return Results.BadRequest("Invalid account ID in session.");
        }
    }


    public async Task<IResult> DeleteCurrentDeviceAsync(HttpContext context)
    {
        // Check for session cookie
        if (!context.Request.Cookies.TryGetValue(".AspNetCore.Session", out var sessionToken))
        {
            return Results.Unauthorized();
        }

        var result = login.HandleGetCurrentUser(context).Result;
        if (result is not Ok<LoginResponse>)
        {
            return Results.Forbid();
        }


        // Access the session using the sessionToken or from the session store
        var accountId = context.Session.GetString("UserId");

        if (string.IsNullOrEmpty(accountId))
        {
            return Results.NotFound();
        }

        if (!context.Request.Cookies.TryGetValue("deviceUuid", out var deviceUuid))
        {
            return Results.NoContent();
        }


        if (int.TryParse(accountId, out var parsedAccountId))
        {
            // Prüfen, ob das Device existiert und zu diesem Account gehört
            var device = await repo.GetDeviceByUuidAsync(Guid.Parse(deviceUuid));
            if (device == null || device.GetAccountId() != parsedAccountId)
            {
                return Results.Forbid(); // oder NotFound
            }
            // Proceed with deleting the device
            var deviceGuid = Guid.Parse(deviceUuid);
            await repo.DeleteDeviceAsync(parsedAccountId, deviceGuid);
            context.Response.Cookies.Append("deviceUuid", "", new CookieOptions
            {
                Expires = DateTimeOffset.UtcNow.AddDays(-1),
                HttpOnly = false,
                IsEssential = true,
                SameSite = SameSiteMode.Lax,
                Path = "/" // Pfad muss der gleiche sein, wie der in LocalStorage angegebene
            });
            return Results.Ok("Device deleted successfully.");
        }
        else
        {
            return Results.BadRequest("Invalid account ID in session.");
        }
    }

    public async Task<IResult> DeleteOtherDeviceAsync(HttpContext context)
    {
        // Check for session cookie
        if (!context.Request.Cookies.TryGetValue(".AspNetCore.Session", out var sessionToken))
        {
            return Results.Unauthorized();
        }

        var result = login.HandleGetCurrentUser(context).Result;
        if (result is not Ok<LoginResponse>)
        {
            return Results.Unauthorized();
        }
        // Access the session using the sessionToken or from the session store
        var accountId = context.Session.GetString("UserId");

        if (string.IsNullOrEmpty(accountId))
        {
            return Results.NotFound();
        }

        var deviceUuid = await context.Request.ReadFromJsonAsync<Guid>();
        if (deviceUuid == Guid.Empty)
        {
            return Results.BadRequest("Device UUID is required.");
        }

        if (int.TryParse(accountId, out var parsedAccountId))
        {
            // Prüfen, ob das Device existiert und zu diesem Account gehört
            var device = await repo.GetDeviceByUuidAsync(Guid.Parse(deviceUuid.ToString()));
            if (device == null || device.GetAccountId() != parsedAccountId)
            {
                return Results.Forbid(); // oder NotFound
            }
            // Proceed with deleting the device
            await repo.DeleteDeviceAsync(parsedAccountId, deviceUuid);
            return Results.Ok("Device deleted successfully.");
        }
        else
        {
            return Results.BadRequest("Invalid account ID in session.");
        }
    }

}
