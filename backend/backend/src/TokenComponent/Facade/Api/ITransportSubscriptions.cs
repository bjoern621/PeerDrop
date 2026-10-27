namespace backend.TokenComponent.Facade.Api;

public interface ITransportSubscriptions
{
    /// <summary>
    /// Hands the transport's connection events to the client registry. Call once at startup, before the first connection.
    /// </summary>
    public void SubscribeToTransport();
}
