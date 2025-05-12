namespace backend;

public class InvalidPasswordFormatException : Exception
{
    public InvalidPasswordFormatException(string message)
        : base(message) { }

    public InvalidPasswordFormatException(string message, Exception inner)
        : base(message, inner) { }
}