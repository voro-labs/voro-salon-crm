# Secrets

```
{
  "JwtKey": "JWT-KEY",
  "EmailSettings:SmtpServer": "smtp.gmail.com",
  "EmailSettings:SmtpPort": "587",
  "EmailSettings:Password": "PASSWORD",
  "EmailSettings:ImapServer": "imap.gmail.com",
  "EmailSettings:ImapPort": "993",
  "EmailSettings:From": "NOME@EMAIL.COM",
  "CorsSettings:AllowedOrigins:4": "https://vorolabs.app",
  "CorsSettings:AllowedOrigins:3": "https://localhost:4200",
  "CorsSettings:AllowedOrigins:2": "https://localhost:3000",
  "CorsSettings:AllowedOrigins:1": "http://localhost:4200",
  "CorsSettings:AllowedOrigins:0": "http://localhost:3000",
  "ConnectionString": {
    "Production": {
      "Server": "SERVER",
      "Port": "PORT",
      "Database": "DATABASE",
      "UserId": "USER_ID",
      "Password": "PASSWORD"
    },
    "Development": {
      "Server": "SERVER",
      "Port": "PORT",
      "Database": "DATABASE",
      "UserId": "USER_ID",
      "Password": "PASSWORD"
    }
  }
}
```

# Migrations e seed

A aplicação **não migra nem faz seed do banco ao subir** fora de `Development`.

Antes isso rodava em todo boot (`MigrateAsync` sobre 69 migrations + 27 queries do seeder),
o que colocava tudo isso na frente da primeira requisição — 22s de TTFB medidos em produção
no primeiro acesso após ociosidade (issue #114).

Onde roda hoje:

| Contexto | Como |
|---|---|
| Deploy no Fly | `release_command` do `fly.toml` / `fly.dev.toml`, uma vez por deploy |
| Local (`Development`) | Automático no startup, como antes |
| Qualquer outro boot | **Manual** — veja abaixo |

Para migrar manualmente (`docker run` da imagem, build Release local, CI, máquina restaurada
de snapshot, ou qualquer boot que não passe por `fly deploy`):

```bash
dotnet VoroSalonCrm.API.dll --migrate
```

O processo aplica migrations, roda o seed e encerra — não sobe o servidor HTTP.

> Sem esse passo, a aplicação sobe normalmente e só falha na primeira query contra um banco
> sem schema. Antes isso era impossível, porque o seed estava no caminho de startup.
