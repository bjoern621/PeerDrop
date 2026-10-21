namespace backend.TelemetryComponent.Dataaccess.Api;

public interface IUsageCountRepository
{
    long CountAccounts();

    /// <summary>
    /// Distinct devices. A device registered with several accounts counts once.
    /// </summary>
    long CountDevices();
}
