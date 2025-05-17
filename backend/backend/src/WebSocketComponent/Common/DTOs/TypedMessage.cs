using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.DTOs;

public abstract class TypedMessage
{
    public abstract string GetTypeString();

    public string ToJson()
    {
        var wrapper = new
        {
            type = GetTypeString(),
            msg = JsonSerializer.Deserialize<object>(JsonSerializer.Serialize(this, this.GetType()))
        };

        Console.WriteLine($"Serialised msg: {JsonSerializer.Serialize(this)}");
        
        Console.WriteLine(JsonSerializer.Serialize(wrapper));
        return JsonSerializer.Serialize(wrapper);

    }
}