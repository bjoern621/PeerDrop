using backend.DeviceComponent.Dataaccess.Api.Entity;
using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.DeviceComponent.Logic.Api;
using backend.MessagingComponent.Common.Api.DTOs;
using backend.MessagingComponent.Dataaccess.Impl;
using backend.MessagingComponent.Logic.Impl;
using backend.TelemetryComponent.Logic.Api;
using backend.tests.TestUtils;
using backend.TokenComponent.Logic.Api;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.tests.MessagingComponent.Logic.Impl;

[Category("UnitTest")]
public class TokenLookupServiceTest
{
    private const string REQUESTER = "sabak";
    private const string TARGET = "rinot";
    private const string OFFLINE = "lukid";
    private const string TARGET_KEY = "BHRhcmdldGtleQ==";
    private const int USER_ID = 7;
    private static readonly Guid DEVICE_UUID = Guid.Parse("8f14e45f-ceea-467f-a0e6-1f2c4b2d8a10");

    private Mock<IClientRegistry> _mockHandler;
    private PublicKeyRepository _publicKeys;
    private Mock<IDeviceService> _mockDeviceService;
    private Mock<IDeviceRepository> _mockDeviceRepository;
    private SentMessages _sent;
    private TokenLookupService _service;

    [SetUp]
    public void Setup()
    {
        _mockHandler = new Mock<IClientRegistry>();
        _mockHandler.Setup(h => h.RemoteTokenExists(It.IsAny<string>())).Returns<string>(t => t is REQUESTER or TARGET);
        _publicKeys = new PublicKeyRepository();
        _publicKeys.Set(TARGET, TARGET_KEY);
        _sent = new SentMessages().Capture<TokenStatusMessage>(_mockHandler);

        _mockDeviceService = new Mock<IDeviceService>();
        _mockDeviceRepository = new Mock<IDeviceRepository>();

        var serviceProvider = new Mock<IServiceProvider>();
        serviceProvider.Setup(p => p.GetService(typeof(IDeviceRepository))).Returns(_mockDeviceRepository.Object);
        var scope = new Mock<IServiceScope>();
        scope.Setup(s => s.ServiceProvider).Returns(serviceProvider.Object);
        var scopeFactory = new Mock<IServiceScopeFactory>();
        scopeFactory.Setup(f => f.CreateScope()).Returns(scope.Object);

        _service = new TokenLookupService(
            _mockHandler.Object,
            _publicKeys,
            new AbuseGuard(new ManualTimeProvider()),
            new PresenceWatchRepository(),
            _mockDeviceService.Object,
            scopeFactory.Object,
            new Mock<IUsageMetrics>().Object,
            NullLogger<TokenLookupService>.Instance);
    }

    private Task LookUp(string token) =>
        _service.HandleTokenLookup(REQUESTER, new TokenLookupMessage { Token = token });

    private Task LookUpDevice() =>
        _service.HandleTokenLookup(REQUESTER, new TokenLookupMessage { DeviceUuid = DEVICE_UUID });

    private TokenStatusMessage LastStatus() => _sent.To<TokenStatusMessage>(REQUESTER)[^1];

    private void SetUpOwnOnlineDevice()
    {
        _mockHandler.Setup(h => h.GetUserIdForClientToken(REQUESTER)).Returns(USER_ID);
        _mockHandler.Setup(h => h.AreSignedInWithSameAccount(REQUESTER, TARGET)).Returns(true);
        _mockDeviceRepository
            .Setup(r => r.GetDeviceByUuidAsync(DEVICE_UUID, USER_ID))
            .ReturnsAsync(new Device("Laptop", DEVICE_UUID, USER_ID));
        _mockDeviceService.Setup(s => s.GetDeviceStatus(DEVICE_UUID)).Returns("online");
        _mockDeviceService.Setup(s => s.GetClientTokenByDeviceUuid(DEVICE_UUID)).Returns(TARGET);
    }

    [Test]
    public async Task HandleTokenLookup_OnlineToken_AnswersWithKeyAndLowercaseToken()
    {
        _mockHandler.Setup(h => h.AreSignedInWithSameAccount(REQUESTER, TARGET)).Returns(true);

        await LookUp(TARGET.ToUpperInvariant());

        Assert.Multiple(() =>
        {
            Assert.That(LastStatus().Token, Is.EqualTo(TARGET));
            Assert.That(LastStatus().DeviceUuid, Is.Null);
            Assert.That(LastStatus().Online, Is.True);
            Assert.That(LastStatus().PublicKey, Is.EqualTo(TARGET_KEY));
            Assert.That(LastStatus().OwnDevice, Is.True);
            Assert.That(LastStatus().RetryAfterMs, Is.Null);
        });
    }

    [Test]
    public async Task HandleClientDisconnected_LookedUpTokenLeaves_TellsRequesterOffline()
    {
        await LookUp(TARGET);

        await _service.HandleClientDisconnected(TARGET.ToUpperInvariant());

        Assert.Multiple(() =>
        {
            Assert.That(LastStatus().Token, Is.EqualTo(TARGET));
            Assert.That(LastStatus().Online, Is.False);
            Assert.That(LastStatus().RetryAfterMs, Is.Null);
        });
    }

    [Test]
    public async Task HandlePublicKey_LookedUpTokenReturns_TellsRequesterOnlineWithKey()
    {
        await LookUp(TARGET);
        await _service.HandleClientDisconnected(TARGET);

        await _service.HandlePublicKey(TARGET.ToUpperInvariant(), new PublicKeyMessage { Key = TARGET_KEY });

        Assert.Multiple(() =>
        {
            Assert.That(_sent.To<TokenStatusMessage>(REQUESTER), Has.Count.EqualTo(3));
            Assert.That(LastStatus().Token, Is.EqualTo(TARGET));
            Assert.That(LastStatus().Online, Is.True);
            Assert.That(LastStatus().PublicKey, Is.EqualTo(TARGET_KEY));
        });
    }

    [Test]
    public async Task HandlePublicKey_OfflineLookupComesOnline_TellsRequesterOnline()
    {
        await LookUp(OFFLINE);

        await _service.HandlePublicKey(OFFLINE, new PublicKeyMessage { Key = TARGET_KEY });

        Assert.Multiple(() =>
        {
            Assert.That(LastStatus().Token, Is.EqualTo(OFFLINE));
            Assert.That(LastStatus().Online, Is.True);
        });
    }

    [Test]
    public async Task HandlePublicKey_RequesterLookedUpAnotherToken_TellsNothing()
    {
        await LookUp(OFFLINE);
        await LookUp(TARGET);

        await _service.HandlePublicKey(OFFLINE, new PublicKeyMessage { Key = TARGET_KEY });

        Assert.That(_sent.To<TokenStatusMessage>(REQUESTER), Has.Count.EqualTo(2));
    }

    [Test]
    public async Task HandlePublicKey_LookupWhileLocked_TellsNothing()
    {
        for (var i = 0; i < 6; i++)
        {
            await LookUp(OFFLINE);
        }
        var sentBefore = _sent.To<TokenStatusMessage>(REQUESTER).Count;

        await LookUp(TARGET);
        await _service.HandlePublicKey(TARGET, new PublicKeyMessage { Key = TARGET_KEY });

        Assert.Multiple(() =>
        {
            Assert.That(_sent.To<TokenStatusMessage>(REQUESTER), Has.Count.EqualTo(sentBefore + 1));
            Assert.That(LastStatus().RetryAfterMs, Is.Not.Null);
        });
    }

    [Test]
    public async Task HandleClientDisconnected_RequesterLeftFirst_TellsNothing()
    {
        await LookUp(TARGET);

        await _service.HandleClientDisconnected(REQUESTER);
        await _service.HandleClientDisconnected(TARGET);

        Assert.That(_sent.To<TokenStatusMessage>(REQUESTER), Has.Count.EqualTo(1));
    }

    [Test]
    public async Task HandleTokenLookup_OfflineToken_AnswersOfflineAndLocksOnSixthMiss()
    {
        for (var i = 0; i < 5; i++)
        {
            await LookUp(OFFLINE);
            Assert.That(LastStatus().RetryAfterMs, Is.Null, $"miss {i + 1}");
        }

        await LookUp(OFFLINE);

        Assert.Multiple(() =>
        {
            Assert.That(LastStatus().Online, Is.False);
            Assert.That(LastStatus().Token, Is.EqualTo(OFFLINE));
            Assert.That(LastStatus().RetryAfterMs, Is.EqualTo(60_000));
        });
    }

    [Test]
    public async Task HandleTokenLookup_WhileLocked_AnswersOfflineForOnlineToken()
    {
        for (var i = 0; i < 6; i++)
        {
            await LookUp(OFFLINE);
        }

        await LookUp(TARGET);

        Assert.Multiple(() =>
        {
            Assert.That(LastStatus().Online, Is.False);
            Assert.That(LastStatus().PublicKey, Is.Null);
            Assert.That(LastStatus().RetryAfterMs, Is.EqualTo(60_000));
        });
    }

    [Test]
    public async Task HandleTokenLookup_OwnOnlineDevice_AnswersWithItsToken()
    {
        SetUpOwnOnlineDevice();

        await LookUpDevice();

        Assert.Multiple(() =>
        {
            Assert.That(LastStatus().Token, Is.EqualTo(TARGET));
            Assert.That(LastStatus().DeviceUuid, Is.EqualTo(DEVICE_UUID));
            Assert.That(LastStatus().Online, Is.True);
            Assert.That(LastStatus().PublicKey, Is.EqualTo(TARGET_KEY));
            Assert.That(LastStatus().OwnDevice, Is.True);
        });
    }

    [Test]
    public async Task HandleTokenLookup_DeviceNotRegisteredForRequester_AnswersOffline()
    {
        SetUpOwnOnlineDevice();
        _mockDeviceRepository.Setup(r => r.GetDeviceByUuidAsync(DEVICE_UUID, USER_ID)).ReturnsAsync((Device?)null);

        await LookUpDevice();

        Assert.Multiple(() =>
        {
            Assert.That(LastStatus().Online, Is.False);
            Assert.That(LastStatus().DeviceUuid, Is.EqualTo(DEVICE_UUID));
        });
    }

    [Test]
    public async Task HandleTokenLookup_DeviceWithoutRequesterSession_AnswersOffline()
    {
        SetUpOwnOnlineDevice();
        _mockHandler.Setup(h => h.GetUserIdForClientToken(REQUESTER)).Returns((int?)null);

        await LookUpDevice();

        Assert.That(LastStatus().Online, Is.False);
    }

    [Test]
    public async Task HandleTokenLookup_DeviceNotOnline_AnswersOffline()
    {
        SetUpOwnOnlineDevice();
        _mockDeviceService.Setup(s => s.GetDeviceStatus(DEVICE_UUID)).Returns("offline");

        await LookUpDevice();

        Assert.That(LastStatus().Online, Is.False);
    }

    [Test]
    public async Task HandleTokenLookup_OfflineDevices_CostNoBudget()
    {
        for (var i = 0; i < 6; i++)
        {
            await LookUpDevice();
        }

        await LookUp(TARGET);

        Assert.That(LastStatus().Online, Is.True);
    }

    [Test]
    public async Task HandleTokenLookup_TokenAndDeviceTogether_SendsNothing()
    {
        await _service.HandleTokenLookup(REQUESTER, new TokenLookupMessage { Token = TARGET, DeviceUuid = DEVICE_UUID });

        Assert.That(_sent.Count, Is.Zero);
    }

    [Test]
    public async Task HandlePublicKey_ValidKey_StoresKey()
    {
        var key = Convert.ToBase64String(new byte[65]);

        await _service.HandlePublicKey(REQUESTER, new PublicKeyMessage { Key = key });

        Assert.That(_publicKeys.Get(REQUESTER), Is.EqualTo(key));
    }

    [TestCase("not base64!")]
    [TestCase("")]
    public async Task HandlePublicKey_InvalidKey_IsIgnored(string key)
    {
        await _service.HandlePublicKey(REQUESTER, new PublicKeyMessage { Key = key });

        Assert.That(_publicKeys.Get(REQUESTER), Is.Null);
    }

    [Test]
    public async Task HandlePublicKey_KeyLongerThan200Characters_IsIgnored()
    {
        await _service.HandlePublicKey(REQUESTER, new PublicKeyMessage { Key = Convert.ToBase64String(new byte[153]) });

        Assert.That(_publicKeys.Get(REQUESTER), Is.Null);
    }
}
