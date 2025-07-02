using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.DeviceComponent.Common.DTOs;

public class DeviceChangedMessage : ITypedMessage
{
    public static string TypeString => "device-changed";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;
}