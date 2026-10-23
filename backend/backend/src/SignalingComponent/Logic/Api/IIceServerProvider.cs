using backend.SignalingComponent.Common.Api.DTOs;

namespace backend.SignalingComponent.Logic.Api;

public interface IIceServerProvider
{
    /// <summary>
    /// Returns the ICE servers for one peer connection of <paramref name="clientToken"/>,
    /// with TURN credentials that expire after <c>IceServerProvider.CredentialLifetime</c>.
    /// Empty where no TURN server is configured: the peers then connect over host candidates alone.
    /// </summary>
    IReadOnlyList<IceServer> CreateIceServers(string clientToken);
}
