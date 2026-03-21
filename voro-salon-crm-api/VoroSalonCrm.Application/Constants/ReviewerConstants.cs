namespace VoroSalonCrm.Application.Constants;

public static class ReviewerConstants
{
    public const string Email = "reviewer@vorolabs.app";
    public const string TwoFactorCode = "123456";

    public static bool IsReviewer(string? email) =>
        string.Equals(email, Email, StringComparison.OrdinalIgnoreCase);
}
