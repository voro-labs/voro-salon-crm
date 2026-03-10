export enum TransactionType {
  Income = 1,
  Expense = 2
}

export enum PaymentMethod {
  Cash = 1,
  CreditCard = 2,
  DebitCard = 3,
  Pix = 4,
  Boleto = 5,
  Other = 99
}

export enum TransactionStatus {
  Pending = 1,
  Partial = 2,
  Paid = 3,
  Overdue = 4,
  Cancelled = 5
}

export interface TransactionCategoryDto {
  id: string
  name: string
  type: TransactionType
  isActive: boolean
  createdAt: string
}

export interface CreateTransactionCategoryDto {
  name: string
  type: TransactionType
}

export interface UpdateTransactionCategoryDto {
  id: string
  name: string
  type: TransactionType
  isActive: boolean
}

export interface TransactionDto {
  id: string
  categoryId?: string
  category?: TransactionCategoryDto
  description: string
  amount: number
  paidAmount: number
  dueDate: string
  paymentDate?: string
  type: TransactionType
  paymentMethod: PaymentMethod
  status: TransactionStatus
  notes?: string
  createdAt: string
}

export interface CreateTransactionDto {
  categoryId?: string
  description: string
  amount: number
  dueDate: string
  type: TransactionType
  paymentMethod: PaymentMethod
  notes?: string
}

export interface UpdateTransactionDto {
  id: string
  categoryId?: string
  description: string
  amount: number
  dueDate: string
  type: TransactionType
  paymentMethod: PaymentMethod
  notes?: string
}

export interface PayTransactionDto {
  id: string
  paidAmount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  notes?: string
}
