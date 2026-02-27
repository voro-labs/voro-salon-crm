dotnet ef migrations add AddInfos --project VoroSwipeEntertainment.Infrastructure --startup-project VoroSwipeEntertainment.API --output-dir Migrations
dotnet ef migrations remove --project VoroSwipeEntertainment.Infrastructure --startup-project VoroSwipeEntertainment.API
dotnet ef database update --project VoroSwipeEntertainment.Infrastructure --startup-project VoroSwipeEntertainment.API


dotnet watch --project VoroSwipeEntertainment.API --urls http://0.0.0.0:5000