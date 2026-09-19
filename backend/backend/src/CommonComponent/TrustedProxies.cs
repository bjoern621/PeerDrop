using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

namespace backend.CommonComponent;

/// <summary>
/// Reverse proxies whose X-Forwarded-For header replaces the connection address.
/// A sender outside the list keeps its connection address, whatever header it sends.
/// </summary>
public static class TrustedProxies
{
    /// <summary>
    /// Comma-separated IP addresses and CIDR networks, e.g. "172.18.0.0/16, 10.0.0.5". Unset: no proxy trusted.
    /// </summary>
    public const string EnvironmentVariable = "TRUSTED_PROXIES";

    public static void Configure(ForwardedHeadersOptions options, string? trustedProxies)
    {
        var entries = (trustedProxies ?? "").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        // Empty known lists make the middleware trust every sender,
        // so the header stays off without entries.
        options.ForwardedHeaders = entries.Length > 0 ? ForwardedHeaders.XForwardedFor : ForwardedHeaders.None;

        // The defaults trust loopback, which never matches a proxy in another container.
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();

        foreach (var entry in entries)
        {
            if (IPAddress.TryParse(entry, out var address))
                options.KnownProxies.Add(address);
            else if (Microsoft.AspNetCore.HttpOverrides.IPNetwork.TryParse(entry, out var network))
                options.KnownNetworks.Add(network);
            else
                throw new ApplicationException($"{EnvironmentVariable} entry is neither an IP address nor a CIDR network: {entry}");
        }
    }
}
