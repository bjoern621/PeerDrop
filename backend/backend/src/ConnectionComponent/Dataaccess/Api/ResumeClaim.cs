namespace backend.ConnectionComponent.Dataaccess.Api;

/// <summary>
/// Outcome of <see cref="IPairRepository.ClaimResume"/>.
/// </summary>
public enum ResumeClaim
{
    /// <summary>The claim waits for the partner's.</summary>
    Recorded,

    /// <summary>The same claim waits already.</summary>
    Repeated,

    /// <summary>The partner had claimed as well, and the two count as connected.</summary>
    Connected,
}
