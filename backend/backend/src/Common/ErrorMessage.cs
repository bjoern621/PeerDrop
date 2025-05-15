using System.Text.Json.Serialization;

namespace backend.Common;

public struct ErrorMessage
{
    [JsonPropertyName("description")]
    public string Description { get; set; }
    
    [JsonPropertyName("expected")]
    public string? Expected { get; set; }
    
    [JsonPropertyName("actual")]
    public string? Actual { get; set; }
}