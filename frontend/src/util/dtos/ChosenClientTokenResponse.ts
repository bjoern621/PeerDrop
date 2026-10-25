/**
 * Response from backend after storing the token that the account receives on every connect.
 *
 * inUse: True if a connection holds the token, so a connect of this account gets a random token until it lets go.
 */
export interface ChosenClientTokenResponse {
    token: string;
    inUse: boolean;
}
