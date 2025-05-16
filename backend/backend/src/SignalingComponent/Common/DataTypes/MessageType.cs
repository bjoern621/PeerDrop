public class MessageType
{
    private MessageType(string value)
    {
        Value = value;
    }

    public string Value { get; private set; }

    public static MessageType Test { get { return new MessageType("test"); } }
    public static MessageType RemoteToken { get { return new MessageType("remote-token"); } }
    public static MessageType ClientToken { get { return new MessageType("client-token"); } }
    public static MessageType Error { get { return new MessageType("error-message"); } }
    public static MessageType Success { get { return new MessageType("success-message"); } }
    public static MessageType IceCandidate { get { return new MessageType("ice-candidate"); } }
    public static MessageType SdpMessage { get { return new MessageType("sdp-message"); } }
    public static MessageType CloseConnection { get { return new MessageType("close-connection-message"); } }

    public string GetValue()
    {
        return Value;
    }

    public static MessageType GetMessageType(string value)
    {
        return value switch
        {
            "test" => Test,
            "remote-token" => RemoteToken,
            "client-token" => ClientToken,
            "error-message" => Error,
            "success-message" => Success,
            "ice-candidate" => IceCandidate,
            "sdp-message" => SdpMessage,
            "close-connection-message" => CloseConnection,
            _ => throw new ArgumentException($"Unknown message type: {value}")
        };
    }
}