# Roadmap de Funcionalidades

## 📱 Mobile

### Funcionalidades

- [ ] A tela de sig-in faz o redirect para a tela de 2fa, isso faz a sugestão de salvar o login (email e senha) não aparecer, pois ele entende que o login não foi um sucesso, no caso o ideal era tudo ser uma tela só com dois forms, devemos validar para isso ser possivel para salvar a sugestão de conta


O autofill do sistema (iOS Keychain / Android Autofill) só dispara quando o fluxo de autenticação é concluído na mesma tela.
Quando você faz:

Login → redirect → tela 2FA

o sistema interpreta como:

“login ainda não finalizado” → não salva credenciais

🔎 Por que isso acontece (comportamento interno)

Os heurísticos do sistema esperam:

Campo email + senha
Submissão
Sucesso final de autenticação naquela mesma tela

Se houver navegação intermediária (2FA, captcha, etc), o salvamento é abortado.


## WEB:
    se eu mudo o status de pendente para concluido ele gear um service record, mas a data desse service record é o dia de hoje, e o serviço foi feito no dia da agenda, como podemos resolver isso?

se eu gero a receita automatico está duplicando os registros, ele não filtra que já foi cadastrado aquele serviço


# notifications não é deletada junto com o cliente, agendamento e etc
# mensagens de whatsapp, chat não são deletadas junto com os clientes

na solicitação de avalição deu essa mensagem:

http://192.168.1.72:9000/api/v1/ClientRating/7781d5b2-22ea-4f60-96ac-2ced166c23c2

{"status":500,"message":"Avaliação não encontrada.","data":null,"hasError":false}

as rotas parecem não condizer com a api:

http://192.168.1.72:9000/api/v1/ClientRating/send-request/7781d5b2-22ea-4f60-96ac-2ced166c23c2