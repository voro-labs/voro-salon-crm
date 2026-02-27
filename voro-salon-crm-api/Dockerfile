FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["VoroSwipeEntertainment.API/VoroSwipeEntertainment.API.csproj", "VoroSwipeEntertainment.API/"]
COPY ["VoroSwipeEntertainment.Application/VoroSwipeEntertainment.Application.csproj", "VoroSwipeEntertainment.Application/"]
COPY ["VoroSwipeEntertainment.Contract/VoroSwipeEntertainment.Contract.csproj", "VoroSwipeEntertainment.Contract/"]
COPY ["VoroSwipeEntertainment.Domain/VoroSwipeEntertainment.Domain.csproj", "VoroSwipeEntertainment.Domain/"]
COPY ["VoroSwipeEntertainment.Infrastructure/VoroSwipeEntertainment.Infrastructure.csproj", "VoroSwipeEntertainment.Infrastructure/"]
COPY ["VoroSwipeEntertainment.Shared/VoroSwipeEntertainment.Shared.csproj", "VoroSwipeEntertainment.Shared/"]
RUN dotnet restore "VoroSwipeEntertainment.API/VoroSwipeEntertainment.API.csproj"
COPY . .
WORKDIR "/src/VoroSwipeEntertainment.API"
RUN dotnet build "VoroSwipeEntertainment.API.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "VoroSwipeEntertainment.API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "VoroSwipeEntertainment.API.dll"]
