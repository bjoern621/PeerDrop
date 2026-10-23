using System.Security.Cryptography;
using System.Text;
using backend.SignalingComponent.Common.Api.DTOs;
using backend.SignalingComponent.Logic.Api;

namespace backend.SignalingComponent.Logic.Impl;

/// <summary>
/// Hands out credentials of the TURN REST scheme that coturn checks with <c>use-auth-secret</c>.
/// The username carries its own expiry.
/// The password signs the username with the shared secret.
/// </summary>
public class IceServerProvider(string? turnHost, string? turnSecret, TimeProvider timeProvider) : IIceServerProvider
{
    // coturn checks the expiry on every allocation refresh,
    // so a relayed transfer dies once its credential runs out.
    public static readonly TimeSpan CredentialLifetime = TimeSpan.FromHours(24);

    public IReadOnlyList<IceServer> CreateIceServers(string clientToken)
    {
        if (turnHost == null || turnSecret == null)
            return [];

        var expiry = timeProvider.GetUtcNow().Add(CredentialLifetime).ToUnixTimeSeconds();
        var username = $"{expiry}:{clientToken}";

        return
        [
            new IceServer { Urls = [$"stun:{turnHost}:3478"] },
            new IceServer
            {
                // 443 over TLS passes firewalls that allow HTTPS alone.
                Urls =
                [
                    $"turn:{turnHost}:3478?transport=udp",
                    $"turn:{turnHost}:3478?transport=tcp",
                    $"turns:{turnHost}:443?transport=tcp",
                ],
                Username = username,
                Credential = Sign(turnSecret, username),
            },
        ];
    }

    private static string Sign(string secret, string username) =>
        Convert.ToBase64String(HMACSHA1.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(username)));
}
