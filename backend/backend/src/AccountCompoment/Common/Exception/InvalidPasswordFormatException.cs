namespace backend.AccountCompoment.Common.Exception;

public class InvalidPasswordFormatException : System.Exception
{
    public InvalidPasswordFormatException(string message)
        : base(message) { }

    public InvalidPasswordFormatException(string message, System.Exception inner)
        : base(message, inner) { }
}