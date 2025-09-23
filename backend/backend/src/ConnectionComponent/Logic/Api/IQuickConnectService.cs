using backend.ConnectionComponent.Common.Api.DTOs;

namespace backend.ConnectionComponent.Logic.Api;

public interface IQuickConnectService
{
    Task HandleQuickConnectMessage(string clientToken, QuickConnectMessage message);
}