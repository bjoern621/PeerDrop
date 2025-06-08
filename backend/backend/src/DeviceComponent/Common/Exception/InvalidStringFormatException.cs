namespace backend.src.DeviceComponent.Common.Exception;

public class InvalidStringFormatException : System.Exception
{
    public InvalidStringFormatException(string message)
        : base(message) { }

    public InvalidStringFormatException(string message, System.Exception inner)
        : base(message, inner) { }
}