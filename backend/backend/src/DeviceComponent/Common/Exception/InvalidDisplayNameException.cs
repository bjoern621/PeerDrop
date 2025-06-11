namespace backend.DeviceComponent.Common.Exception;

public class InvalidDisplayNameException : System.Exception
{
    public InvalidDisplayNameException(string message)
        : base(message) { }

    public InvalidDisplayNameException(string message, System.Exception inner)
        : base(message, inner) { }
}