using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Facade.Api;
using backend.DeviceComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.DeviceComponent.Facade.Impl;

public class DeviceWebsocketMessages(IWebSocketHandler _webSocketHandler, IDeviceService _deviceService) : IDeviceWebsocketMessages
{
    public void SubscribeToMessageHandlers()
    {
        _webSocketHandler.SubscribeToMessageType<DeviceHeartbeatMessage>(DeviceHeartbeatMessage.TypeString, _deviceService.HandleDeviceHeartbeat);
    }
}