using backend.Common;
using backend.SignalingComponent.Common.Datatype;
using backend.SignalingComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.SignalingComponent.Logic.Impl;

public class SignalingService : ISignalingService
{
    private readonly IWebSocketHandler _webSocketHandler;

    private const string REMOTE_TOKEN_MESSAGE_TYPE = "remote-token";
    private const string ERROR_MESSAGE_TYPE = "error-message";
    private const string SUCCESS_MESSAGE_TYPE = "success-message";
    private const string ICE_CANDIDATE_MESSAGE_TYPE = "ice-candidate";
    private const string SDP_MESSAGE_TYPE = "sdp-message";

    public SignalingService(IWebSocketHandler webSocketHandler)
    {
        _webSocketHandler = webSocketHandler;
    }

    public void SubscribeToMessageHandlers()
    {
        _webSocketHandler.SubscribeToMessageType<RemoteTokenMessage>(REMOTE_TOKEN_MESSAGE_TYPE, async (clientId, message) =>
        {
            Console.WriteLine($"from {clientId}: Local Token");
            string remoteToken = message.RemoteToken;

            if (!_webSocketHandler.RemoteTokenExists(remoteToken))
            {
                var exception = new TypedMessage<ErrorMessage>()
                {
                    Type = ERROR_MESSAGE_TYPE,
                    Msg = new ErrorMessage
                    {
                        Description = $"Remote token {remoteToken} does not exist"
                    }
                };

                await _webSocketHandler.SendMessage(clientId, exception);
                Console.WriteLine($"to {clientId}: ERROR: Remote token {remoteToken} does not exist");
            }
            else
            {
                var success = new TypedMessage<SuccessMessage>()
                {
                    Type = SUCCESS_MESSAGE_TYPE,
                    Msg = new SuccessMessage
                    {
                        Description = $"Token {remoteToken} exists, OK"
                    }
                };

                var response = new TypedMessage<RemoteTokenMessage>()
                {
                    Type = REMOTE_TOKEN_MESSAGE_TYPE,
                    Msg = new RemoteTokenMessage
                    {
                        RemoteToken = clientId
                    }
                };

                await _webSocketHandler.SendMessage(clientId, success);
                Console.WriteLine($"to {clientId}: SUCCESS: Remote token {remoteToken} exists");

                await _webSocketHandler.SendMessage(remoteToken, response);
                Console.WriteLine($"to {remoteToken}: Remote Token");
            }
        });

        _webSocketHandler.SubscribeToMessageType<IceCandidateMessage>(ICE_CANDIDATE_MESSAGE_TYPE, async (clientId, message) =>
        {
            Console.WriteLine($"from {clientId}: Local ICE Candidate");
            string remoteToken = message.RemoteToken;

            var response = new TypedMessage<IceCandidateMessage>()
            {
                Type = ICE_CANDIDATE_MESSAGE_TYPE,
                Msg = new IceCandidateMessage()
                {
                    RemoteToken = clientId.ToString(),
                    IceCandidate = message.IceCandidate
                }
            };

            await _webSocketHandler.SendMessage(remoteToken, response);
            Console.WriteLine($"to {remoteToken}: Remote ICE Candidate");
        });

        _webSocketHandler.SubscribeToMessageType<SdpMessage>(SDP_MESSAGE_TYPE, async (clientId, message) =>
        {
            Console.WriteLine($"from {clientId}: Local SDP");
            string remoteToken = message.RemoteToken;

            var response = new TypedMessage<SdpMessage>()
            {
                Type = SDP_MESSAGE_TYPE,
                Msg = new SdpMessage()
                {
                    RemoteToken = clientId.ToString(),
                    Description = message.Description
                }
            };

            await _webSocketHandler.SendMessage(remoteToken, response);
            Console.WriteLine($"to {remoteToken}: Remote SDP");
        });
    }
}
