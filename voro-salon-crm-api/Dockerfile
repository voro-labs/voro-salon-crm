FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["VoroSalonCrm.API/VoroSalonCrm.API.csproj", "VoroSalonCrm.API/"]
COPY ["VoroSalonCrm.Application/VoroSalonCrm.Application.csproj", "VoroSalonCrm.Application/"]
COPY ["VoroSalonCrm.Contract/VoroSalonCrm.Contract.csproj", "VoroSalonCrm.Contract/"]
COPY ["VoroSalonCrm.Domain/VoroSalonCrm.Domain.csproj", "VoroSalonCrm.Domain/"]
COPY ["VoroSalonCrm.Infrastructure/VoroSalonCrm.Infrastructure.csproj", "VoroSalonCrm.Infrastructure/"]
COPY ["VoroSalonCrm.Shared/VoroSalonCrm.Shared.csproj", "VoroSalonCrm.Shared/"]
RUN dotnet restore "VoroSalonCrm.API/VoroSalonCrm.API.csproj"
COPY . .
WORKDIR "/src/VoroSalonCrm.API"
RUN dotnet build "VoroSalonCrm.API.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "VoroSalonCrm.API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "VoroSalonCrm.API.dll"]
