namespace VoroSalonCrm.Domain.Enums
{
    public enum AnamnesisFieldType
    {
        ShortText = 1,
        LongText = 2,
        Number = 3,
        SingleSelection = 4,
        MultipleSelection = 5,
        Boolean = 6,
        Signature = 7,
        ImageUpload = 8
    }

    public enum AnamnesisSection
    {
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
        TreatmentProtocol = 11
    }

    public enum AnamnesisSheetStatus
    {
        Draft = 1,
        Completed = 2,
        Archived = 3
    }

    public enum AnamnesisSignatureType
    {
        Client = 1,
        Professional = 2
    }
}
