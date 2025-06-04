/**
 * Response from backend when User logs in or fetches their user name.
 * 
 * message: Successful login message or the display name of the user.
 */
export interface LoginResponse {
    message: string;
}