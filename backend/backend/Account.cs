namespace backend;

public class Account
{
    private string _displayName;
    private string _password;
    
    // vielleicht auch statt displayname die email angeben können..
    public Account(string displayName, string password)
    {
        if (displayName == null || password == null)
        {
            throw new ArgumentException("Please provide both displayName and password");
        }
        _displayName = displayName;
        _password = encryptPassword(password);
    }

    public string getName() {
        return _displayName;
    }

    public string getPassword() {
        return _password;
    }
    /**
     * Hash und Salt des Passwortes.
     */
    private string encryptPassword(string password)
    {
        throw new System.NotImplementedException();
    }
}