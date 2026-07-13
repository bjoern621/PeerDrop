namespace backend.LanComponent.Facade.Api;

public interface ILanEventSubscriptions
{
    /// <summary>
    /// Wires LAN discovery to the WebSocket connection lifecycle events.
    /// </summary>
    public void SubscribeToEvents();
}
