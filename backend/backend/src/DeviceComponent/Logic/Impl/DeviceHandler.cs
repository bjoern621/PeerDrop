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

namespace backend.AccountCompoment.Logic.Impl
{
    public class DeviceHandler(IDeviceRepository repo) : IDeviceHandler
    {
        public async Task<IResult> RegisterDeviceAsync(HttpContext context)
        {
            // Deserialize the request body to get the accountId (or other data)
            DeviceRegisterDto? deviceDto;
            try
            {
                deviceDto = await JsonSerializer.DeserializeAsync<DeviceRegisterDto>(
                    context.Request.Body,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );
            }
            catch (Exception)
            {
                return Results.BadRequest("Invalid JSON format.");
            }

            if (deviceDto == null || deviceDto.AccountId == 0)
                return Results.BadRequest("Missing account ID or invalid data.");

            // Retrieve the display name from the User-Agent header (you can extract specific info if needed)
            string displayName = context.Request.Headers["User-Agent"].ToString();

            // Generate a new UUID for the device
            var deviceUUID = Guid.NewGuid();

            // Create a new device object to save in the repository
            var device = new Device(displayName, deviceUUID, deviceDto.AccountId);

            // Save the device to the repository (database)
            var savedDevice = await repo.SaveAsync(device);

            // Return the UUID in the response so that it can be stored in the frontend cookie
            return Results.Ok(new { uuid = deviceUUID });
        }

        public async Task<IResult> GetDeviceByUuidAsync(HttpContext context)
        {
            // Deserialize the request body to get uuid
            DeviceLoginDto? deviceDto;
            try
            {
                deviceDto = await JsonSerializer.DeserializeAsync<DeviceLoginDto>(
                    context.Request.Body,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );
            }
            catch (Exception)
            {
                return Results.BadRequest("Invalid JSON format.");
            }
             if (deviceDto == null)
                return Results.BadRequest("Missing Uuid or invalid data.");

            // Retrieve the device by UUID from the repository
            var device = await repo.GetDeviceByUuidAsync(deviceDto.Uuid);

            if (device == null)
                return Results.NotFound("Device not found.");

            // Return the device display name or other relevant information
            return Results.Ok(new { displayName = device.GetDisplayName() });
        }
    }
}
