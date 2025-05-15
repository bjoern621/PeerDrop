namespace backend.AccountCompoment.Common.Exception;

public class InvalidUsernameFormatException : System.Exception
{
    public InvalidUsernameFormatException(string message)
        : base(message) { }

    public InvalidUsernameFormatException(string message, System.Exception inner)
        : base(message, inner) { }
}