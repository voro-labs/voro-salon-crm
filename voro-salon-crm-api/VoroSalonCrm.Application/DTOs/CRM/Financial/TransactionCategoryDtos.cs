using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.CRM.Financial
{
    public class TransactionCategoryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public TransactionType Type { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }

    public class CreateTransactionCategoryDto
    {
        public string Name { get; set; } = string.Empty;
        public TransactionType Type { get; set; }
    }

    public class UpdateTransactionCategoryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public TransactionType Type { get; set; }
        public bool IsActive { get; set; }
    }
}
