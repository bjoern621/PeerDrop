namespace backend;

public class InvalidUsernameFormatException : Exception
{
    public InvalidUsernameFormatException(string message)
        : base(message) { }

    public InvalidUsernameFormatException(string message, Exception inner)
        : base(message, inner) { }
}