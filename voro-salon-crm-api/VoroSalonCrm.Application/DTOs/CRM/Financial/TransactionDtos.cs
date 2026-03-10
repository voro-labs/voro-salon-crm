using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.CRM.Financial
{
    public class TransactionDto
    {
        public Guid Id { get; set; }
        public Guid? CategoryId { get; set; }
        public TransactionCategoryDto? Category { get; set; }

        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal PaidAmount { get; set; }

        public DateTimeOffset DueDate { get; set; }
        public DateTimeOffset? PaymentDate { get; set; }

        public TransactionType Type { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public TransactionStatus Status { get; set; }

        public string? Notes { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }

    public class CreateTransactionDto
    {
        public Guid? CategoryId { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTimeOffset DueDate { get; set; }
        
        public TransactionType Type { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        
        public string? Notes { get; set; }
    }

    public class UpdateTransactionDto
    {
        public Guid Id { get; set; }
        public Guid? CategoryId { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTimeOffset DueDate { get; set; }
        
        // Em um update pode alterar tipo/método caso tenha errado
        public TransactionType Type { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        
        public string? Notes { get; set; }
    }

    public class PayTransactionDto
    {
        public Guid Id { get; set; }
        public decimal PaidAmount { get; set; }
        public DateTimeOffset PaymentDate { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public string? Notes { get; set; }
    }
}
