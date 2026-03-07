ASPNETCORE_ENVIRONMENT=Development

# Last Migrations
dotnet ef migrations add AddAppointmentIdServiceRecord --project VoroSalonCrm.Infrastructure --startup-project VoroSalonCrm.API --output-dir Migrations

# Remove Last Migrations
dotnet ef migrations remove --project VoroSalonCrm.Infrastructure --startup-project VoroSalonCrm.API

# Update
dotnet ef database update --project VoroSalonCrm.Infrastructure --startup-project VoroSalonCrm.API

# Watch
dotnet watch --project VoroSalonCrm.API --urls http://0.0.0.0:5000