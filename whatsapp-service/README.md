# Qualivox WhatsApp Service

Serviço dedicado 24/7 para conexões WhatsApp via Baileys.

## Arquitetura

- **Railway**: Este serviço (Node.js + Express + Baileys)
- **Vercel**: Dashboard e API principal (Next.js)
- **Supabase**: Banco de dados compartilhado

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Verificação de saúde |
| GET | `/connections` | Listar conexões |
| POST | `/connect/:id` | Conectar instância WhatsApp |
| POST | `/disconnect/:id` | Desconectar |
| POST | `/send/:id` | Enviar mensagem |

## Variáveis de Ambiente

```env
DATABASE_URL=postgresql://...
WEBHOOK_URL=https://qualivox.com.br/api/whatsapp/webhook
PORT=3001
AUTH_DIR=./auth
```

## Deploy no Railway

1. Crie um novo projeto no Railway
2. Conecte este repositório
3. Configure as variáveis de ambiente
4. Deploy automático

## Comunicação com Vercel

### Vercel → Railway (Enviar mensagem)
```
POST https://railway-app.up.railway.app/send/{connectionId}
Body: { "phone": "5511999999999", "message": "Olá!" }
```

### Railway → Vercel (Receber mensagem)
```
POST https://qualivox.com.br/api/whatsapp/webhook
Body: { "event": "message", "data": {...}, "connectionId": "..." }
```
