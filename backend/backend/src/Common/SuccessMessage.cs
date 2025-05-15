using System.Text.Json.Serialization;

namespace backend.Common;

public struct SuccessMessage
{
    [JsonPropertyName("description")]
    public string Description { get; set; }
}