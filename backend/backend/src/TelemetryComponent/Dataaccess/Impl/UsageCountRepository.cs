using backend.TelemetryComponent.Dataaccess.Api;
using Npgsql;

namespace backend.TelemetryComponent.Dataaccess.Impl;

/// <summary>
/// Synchronous: the metrics exporter reads these from its own thread, without an async callback.
/// </summary>
public class UsageCountRepository(NpgsqlDataSource _dataSource) : IUsageCountRepository
{
    public long CountAccounts()
    {
        using var cmd = _dataSource.CreateCommand("SELECT count(*) FROM users");
        return (long)cmd.ExecuteScalar()!;
    }

    public long CountDevices()
    {
        using var cmd = _dataSource.CreateCommand("SELECT count(DISTINCT uuid) FROM devices");
        return (long)cmd.ExecuteScalar()!;
    }
}
