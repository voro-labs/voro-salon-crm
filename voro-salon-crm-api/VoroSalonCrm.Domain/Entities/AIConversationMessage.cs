namespace VoroSalonCrm.Domain.Entities
{
    public class AIConversationMessage
    {
        public Guid Id { get; private set; }
        public Guid TenantId { get; private set; }
        public string PhoneNumber { get; private set; } = string.Empty;
        public string Role { get; private set; } = string.Empty;
        public string Content { get; private set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; private set; }

        private AIConversationMessage() { }

        public static AIConversationMessage Create(Guid tenantId, string phoneNumber, string role, string content)
        {
            return new AIConversationMessage
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PhoneNumber = phoneNumber,
                Role = role,
                Content = content,
                CreatedAt = DateTimeOffset.UtcNow
            };
        }
    }
}
