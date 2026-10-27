using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Facade.Api;
using backend.DeviceComponent.Logic.Api;
using backend.TokenComponent.Logic.Api;

namespace backend.DeviceComponent.Facade.Impl;

public class DeviceWebsocketMessages(IClientRegistry _clientRegistry, IDeviceService _deviceService) : IDeviceWebsocketMessages
{
    public void SubscribeToMessageHandlers()
    {
        _clientRegistry.SubscribeToMessageType<DeviceHeartbeatMessage>(DeviceHeartbeatMessage.TypeString, _deviceService.HandleDeviceHeartbeat);
    }
}