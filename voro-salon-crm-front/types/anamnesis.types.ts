export enum AnamnesisFieldType {
  ShortText = 1,
  LongText = 2,
  Number = 3,
  SingleSelection = 4,
  MultipleSelection = 5,
  Boolean = 6,
  Signature = 7,
  ImageUpload = 8,
}

export enum AnamnesisSection {
  ClientData = 1,
  MainComplaint = 2,
  HairHistory = 3,
  HairRoutine = 4,
  GeneralHealth = 5,
  MedicationUse = 6,
  Lifestyle = 7,
  FamilyHistory = 8,
  ScalpEvaluation = 9,
  CapillaryDiagnosis = 10,
  TreatmentProtocol = 11,
}

export const ANAMNESIS_SECTION_LABELS: Record<AnamnesisSection, string> = {
  [AnamnesisSection.ClientData]: "Dados do Cliente",
  [AnamnesisSection.MainComplaint]: "Queixa Principal",
  [AnamnesisSection.HairHistory]: "Histórico Capilar",
  [AnamnesisSection.HairRoutine]: "Rotina Capilar",
  [AnamnesisSection.GeneralHealth]: "Saúde Geral",
  [AnamnesisSection.MedicationUse]: "Uso de Medicamentos",
  [AnamnesisSection.Lifestyle]: "Estilo de Vida",
  [AnamnesisSection.FamilyHistory]: "Histórico Familiar",
  [AnamnesisSection.ScalpEvaluation]: "Avaliação do Couro Cabeludo",
  [AnamnesisSection.CapillaryDiagnosis]: "Diagnóstico Capilar",
  [AnamnesisSection.TreatmentProtocol]: "Protocolo de Tratamento",
};

export interface AnamnesisQuestion {
  id: string;
  identifier: string;
  label: string;
  placeholder?: string;
  fieldType: AnamnesisFieldType;
  options?: string; // JSON string
  section: AnamnesisSection;
  order: number;
  isRequired: boolean;
}

export interface AnamnesisResponse {
  questionId: string;
  value: string;
}

export interface AnamnesisEvidence {
  url: string;
  type?: string;
  description?: string;
}

export interface AnamnesisSignature {
  type: number;
  signatureData: string;
}

export interface AnamnesisSheet {
  id: string;
  clientId: string;
  professionalId: string;
  professionalName?: string;
  date: string;
  diagnosis?: string;
  treatmentProtocol?: string;
  status: number;
  responses: AnamnesisResponse[];
  evidences: AnamnesisEvidence[];
  signatures: AnamnesisSignature[];
  createdAt: string;
}
