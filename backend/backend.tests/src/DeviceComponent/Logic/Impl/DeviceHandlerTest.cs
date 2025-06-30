using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.DeviceComponent.Dataaccess.Api.Entity;
using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Logic.Impl;
using backend.tests.TestUtils;
using Moq;
using Microsoft.AspNetCore.Http;
using backend.AccountComponent.Logic.Api;
using backend.AccountComponent.Common.Api.DTOs;
using Microsoft.AspNetCore.Http.HttpResults;
using backend.DeviceComponent.Logic.Api;

namespace backend.tests.DeviceComponent.Logic.Impl;

[Category("UnitTest")]
public class DeviceHandlerTests
{
    private Mock<IDeviceRepository> _repoMock;
    private Mock<IAccountLoginHandler> _loginHandlerMock;
    private Mock<IDeviceService> _deviceServiceMock;
    private DeviceHandler _deviceHandler;

    [SetUp]
    public void SetUp()
    {
        _repoMock = new Mock<IDeviceRepository>();
        _loginHandlerMock = new Mock<IAccountLoginHandler>();
        _deviceServiceMock = new Mock<IDeviceService>();
        _deviceHandler = new DeviceHandler(_repoMock.Object, _loginHandlerMock.Object, _deviceServiceMock.Object);
    }

    private HttpContext CreateValidContext(string userId, Boolean inSession, Guid deviceUuid = default, string userAgent = "Mozilla-Firefox")
    {
        var context = HttpUtil.CreateMockHttpContext(new { });
        context.Session.SetString("UserId", userId);
        context.Request.Headers.UserAgent = userAgent;
        if (inSession)
        {
            context.Request.Headers.Cookie = $".AspNetCore.Session=session123;";
        }
        if (deviceUuid != Guid.Empty)
        {
            context.Request.Headers.Cookie = $".AspNetCore.Session=session123; deviceUuid={deviceUuid}";
        }


        _loginHandlerMock.Setup(l => l.HandleGetCurrentUser(context))
            .ReturnsAsync(Results.Ok(new LoginResponse("Logged in successfully")));

        return context;
    }

    [Test]
    public async Task RegisterDeviceAsync_WhenDeviceNotRegistered_ReturnsOkWithUuid()
    {
        // Arrange
        var context = CreateValidContext("6", true);
        Guid generatedGuid = Guid.NewGuid();

        _repoMock.Setup(r => r.SaveDeviceAsync(It.IsAny<Device>()))
                 .ReturnsAsync(generatedGuid);

        // Act
        var result = await _deviceHandler.RegisterDeviceAsync(context);

        // Assert
        Assert.That(result, Is.TypeOf<Ok<DeviceRegisterDto>>());
        var okResult = result as Ok<DeviceRegisterDto>;
        Assert.That(okResult?.Value, Has.Property("uuid"));
    }

    [Test]
    public async Task RegisterDeviceAsync_WhenDeviceAlreadyRegistered_OverridesExistingUuid()
    {
        Guid guid = Guid.NewGuid();
        // Arrange
        var context = CreateValidContext("6", true, deviceUuid: guid);

        // Act
        var result = await _deviceHandler.RegisterDeviceAsync(context);

        // Assert
        Assert.That(result, Is.TypeOf<Ok<DeviceRegisterDto>>());
        var okResult = result as Ok<DeviceRegisterDto>;
        Assert.That(okResult?.Value, Has.Property("uuid"));
    }

    [Test]
    public async Task RegisterDeviceAsync_WhenSessionInvalid_ReturnsUnauthorized()
    {
        // Arrange
        var context = HttpUtil.CreateMockHttpContext(new { });
        context.Session.Clear(); // no "UserId"
        context.Request.Headers["User-Agent"] = "Mozilla-Firefox";

        _loginHandlerMock.Setup(l => l.HandleGetCurrentUser(context))
            .ReturnsAsync(Results.Ok(new LoginResponse("Logged in successfully")));

        // Act
        var result = await _deviceHandler.RegisterDeviceAsync(context);

        // Assert
        Assert.That(result, Is.TypeOf<UnauthorizedHttpResult>());
    }

    [Test]
    public async Task GetDevicesByUserAsync_WhenDeviceUuidProvided_ReturnsFilteredDeviceList()
    {
        Guid guid = Guid.NewGuid();
        // Arrange
        var context = CreateValidContext("1", true, deviceUuid: guid, userAgent: "Windows Mozilla");

        _repoMock.Setup(r => r.GetAllDisplayNamesForAccountAsync(1, guid))
                 .ReturnsAsync(new List<DeviceLoginDto>
                 {
                     new DeviceLoginDto { DisplayName = "Windows Mozilla", IsCurrentDevice = true, Uuid = guid, Status = "online" },
                 });

        // Act
        var result = await _deviceHandler.GetDevicesByUserAsync(context);

        // Assert
        Assert.That(result, Is.TypeOf<Ok<DeviceResponseDTO>>());
        var okResult = result as Ok<DeviceResponseDTO>;
        Assert.That(okResult, Is.Not.Null, "Result is null");
        Assert.That(okResult.Value, Is.Not.Null, "Value is null");
        Assert.That(okResult.Value.Devices, Is.Not.Null, "Devices list is null");
        Assert.That(okResult?.Value?.Devices[0].DisplayName, Is.EqualTo("Windows Mozilla"));
        Assert.That(okResult?.Value?.Devices[0].IsCurrentDevice, Is.True);
    }

    [Test]
    public async Task GetDevicesByUserAsync_WhenDeviceUuidNotProvided_ReturnsDeviceList()
    {
        // Arrange
        var context = CreateValidContext("1", true, userAgent: "Windows Mozilla");

        _repoMock.Setup(r => r.GetAllDisplayNamesForAccountAsync(1, It.IsAny<Guid>()))
            .ReturnsAsync(new List<DeviceLoginDto>
            {
                new() { DisplayName = "Windows Mozilla", IsCurrentDevice = false, Uuid = Guid.Empty, Status = "online" },
                new() { DisplayName = "Windows Mozilla", IsCurrentDevice = false, Uuid = Guid.Empty , Status = "online" }
            });

        // Act
        var result = await _deviceHandler.GetDevicesByUserAsync(context);

        // Assert
        Assert.That(result, Is.TypeOf<Ok<DeviceResponseDTO>>());
        var okResult = result as Ok<DeviceResponseDTO>;
        Assert.That(okResult, Is.Not.Null, "Result is null");
        Assert.That(okResult.Value, Is.Not.Null, "Value is null");
        Assert.That(okResult.Value.Devices, Is.Not.Null, "Devices list is null");
        Assert.That(okResult.Value.Devices.Count, Is.EqualTo(2));
    }

    [Test]
    public async Task GetDevicesByUserAsync_WhenSessionInvalid_ReturnsUnauthorized()
    {
        // Arrange
        var context = HttpUtil.CreateMockHttpContext(new { });
        context.Session.Clear(); // Simulate missing session

        _loginHandlerMock.Setup(l => l.HandleGetCurrentUser(context))
            .ReturnsAsync(Results.Ok(new LoginResponse("Logged in successfully")));

        // Act
        var result = await _deviceHandler.GetDevicesByUserAsync(context);

        // Assert
        Assert.That(result, Is.TypeOf<UnauthorizedHttpResult>());
    }
}
