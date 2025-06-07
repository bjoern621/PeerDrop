namespace backend.DeviceComponent.Common.Exception;

public class InvalidDisplayNameFormatException : System.Exception
{
    public InvalidDisplayNameFormatException(string message)
        : base(message) { }

    public InvalidDisplayNameFormatException(string message, System.Exception inner)
        : base(message, inner) { }
}