using System;
using System.Text.Json;
using backend.AccountCompoment.Common.DTOs;
using backend.AccountCompoment.Dataaccess.Api.Entity;
using backend.AccountCompoment.Dataaccess.Api.Repo;
using backend.AccountCompoment.Logic.Api;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Dataaccess.Api.Entity;
using backend.DeviceComponent.Logic.Api;
using backend.DeviceComponent.Dataaccess.Api.Repo;
using Microsoft.AspNetCore.Http.HttpResults;
using System.Text.RegularExpressions;

namespace backend.AccountCompoment.Logic.Impl
{
    public class DeviceHandler(IDeviceRepository repo, IAccountLoginHandler login) : IDeviceHandler
    {
        public async Task<IResult> RegisterDeviceAsync(HttpContext context)
        {

            if (!context.Request.Cookies.TryGetValue(".AspNetCore.Session", out var sessionToken))
            {
                return Results.Unauthorized();
            }
            else
            {
                Console.WriteLine("Session Token received", sessionToken);
            }
            if (context.Request.Cookies.ContainsKey("deviceUuid"))
            {
                return Results.BadRequest("Device is already registered.");
            }

            var result = await login.HandleGetCurrentUser(context);
            if (result is Ok<LoginResponse> okResult)
            {
                Console.WriteLine("User is logged in", okResult);
            }
            else
            {
                Results.Unauthorized();
            }
            var accountIdCon = context.Session.GetString("UserId");
            if (int.TryParse(accountIdCon, out var accountId))
            {
                // accountId is now an int
                Console.WriteLine("Id was successfully parsed.");
            }
            else
            { 
                Console.WriteLine("Id is not an integer.");
            }
   
            // Retrieve the display name from the User-Agent header (you can extract specific info if needed)
            string displayNameRaw = context.Request.Headers["User-Agent"].ToString();
            string displayName = GetBrowserAndOs(displayNameRaw);

            // Generate a new UUID for the device
            var deviceUuid = Guid.NewGuid();

            // Create a new device object to save in the repository
            var device = new Device(displayName, deviceUuid, accountId);

            // Save the device to the repository (database)
            await repo.SaveDeviceAsync(device);

            context.Response.Cookies.Append("deviceUuid", deviceUuid.ToString(), new CookieOptions
            {
                HttpOnly = true,
                IsEssential = true,
                SameSite = SameSiteMode.Lax, // or Lax for cross-page use
                Expires = DateTimeOffset.UtcNow.AddYears(5)
            });

            // Return the UUID in the response so that it can be stored in the frontend cookie
            return Results.Ok(new { uuid = deviceUuid });
        }
        
        private string GetBrowserAndOs(string userAgent)
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
        else
        {
            os = "Unknown OS";
        }

        // Extract Browser (simplified for common browsers)
        string browser = "Unknown Browser";

        // Check for Firefox
        if (userAgent.Contains("Firefox"))
        {
            browser = "Mozilla";
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
            if (result is Ok<LoginResponse> okResult)
            {
                Console.WriteLine("User is logged in", okResult);
            }
            else
            {
                Results.Unauthorized();
            }

            // Access the session using the sessionToken or from the session store
            var accountId = context.Session.GetString("UserId");

            if (string.IsNullOrEmpty(accountId))
            {
                return Results.Unauthorized();
            }

            if (int.TryParse(accountId, out var parsedAccountId))
            {
                // Proceed with fetching the devices for the user
                var devices = await repo.GetAllDisplayNamesForAccountAsync(parsedAccountId);
                var deviceResponse = new DeviceResponse
                {
                    Message = "success",
                    Devices = devices
                };
                return Results.Ok(deviceResponse);  // Return the devices or relevant data
            }
            else
            {
                return Results.BadRequest("Invalid account ID in session.");
            }
        }       
    }
}
