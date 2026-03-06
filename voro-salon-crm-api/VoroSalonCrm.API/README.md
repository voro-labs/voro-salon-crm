dotnet ef migrations add AddTenantModules --project VoroSalonCrm.Infrastructure --startup-project VoroSalonCrm.API --output-dir Migrations
dotnet ef migrations remove --project VoroSalonCrm.Infrastructure --startup-project VoroSalonCrm.API
dotnet ef database update --project VoroSalonCrm.Infrastructure --startup-project VoroSalonCrm.API


dotnet watch --project VoroSalonCrm.API --urls http://0.0.0.0:5000