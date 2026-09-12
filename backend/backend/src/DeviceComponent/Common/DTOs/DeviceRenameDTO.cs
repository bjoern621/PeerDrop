using System.Text.Json.Serialization;

namespace backend.DeviceComponent.Common.DTOs;

public class DeviceRenameDto
{
    [JsonPropertyName("uuid")]
    public Guid Uuid { get; set; }

    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = "";
}
