namespace backend.MessagingComponent.Logic.Types;

public static class RetryAfter
{
    /// <summary>
    /// Rounds up, so a client retrying after the returned milliseconds never comes too early.
    /// </summary>
    public static long? ToMilliseconds(TimeSpan? wait) =>
        wait == null ? null : (long)Math.Ceiling(wait.Value.TotalMilliseconds);
}
