# Documentação da API

# Documentação da API - Gestão de Leads com IA

## Informações Gerais

**Versão:** 1.0.0  
**URL Base:** `https://api.leadmasterai.com/v1`  
**Protocolo:** HTTPS  
**Formato:** JSON  

## Autenticação

A API utiliza autenticação JWT (JSON Web Token). Inclua o token no cabeçalho Authorization de todas as requisições autenticadas.

```http
Authorization: Bearer {seu_jwt_token}
```

### Login
```http
POST /auth/login
```

**Parâmetros:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "def50200e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "usuario@exemplo.com",
      "role": "manager"
    }
  }
}
```

---

## Gestão de Leads

### Listar Leads
```http
GET /leads
```

**Parâmetros de Query:**
- `page` (número): Página atual (padrão: 1)
- `limit` (número): Itens por página (padrão: 20)
- `status` (string): Filtrar por status
- `source` (string): Filtrar por origem
- `search` (string): Buscar por nome, email ou telefone

**Exemplo:**
```http
GET /leads?page=1&limit=20&status=qualificado&search=joão
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "João Santos",
        "email": "joao@exemplo.com",
        "phone": "+5511999999999",
        "status": "qualificado",
        "score": 85,
        "source": "whatsapp",
        "tags": ["urgente", "premium"],
        "assignedTo": {
          "id": "user-uuid",
          "name": "Maria Silva"
        },
        "lastInteraction": "2026-03-18T10:30:00Z",
        "createdAt": "2026-03-15T14:20:00Z",
        "updatedAt": "2026-03-18T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### Criar Lead
```http
POST /leads
```

**Parâmetros:**
```json
{
  "name": "Maria Oliveira",
  "email": "maria@exemplo.com",
  "phone": "+5511888888888",
  "source": "whatsapp",
  "assignedTo": "user-uuid",
  "tags": ["novo", "interesse-alto"],
  "customFields": {
    "empresa": "Tech Solutions",
    "cargo": "Gerente"
  }
}
```

**Resposta (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Maria Oliveira",
    "email": "maria@exemplo.com",
    "phone": "+5511888888888",
    "status": "novo",
    "score": 0,
    "source": "whatsapp",
    "tags": ["novo", "interesse-alto"],
    "createdAt": "2026-03-18T12:00:00Z"
  }
}
```

### Atualizar Lead
```http
PUT /leads/{leadId}
```

**Parâmetros:**
```json
{
  "status": "em_negociacao",
  "score": 75,
  "assignedTo": "new-user-uuid",
  "tags": ["urgente", "premium"],
  "notes": "Cliente demonstrou interesse em upgrade"
}
```

### Qualificação Automática por IA
```http
POST /leads/{leadId}/qualify
```

**Parâmetros:**
```json
{
  "context": "Cliente perguntou sobre preços e demonstrou urgência",
  "previousInteractions": 3
}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "score": 88,
    "qualification": "alta_prioridade",
    "reasons": [
      "Demonstrou urgência na compra",
      "Fez perguntas específicas sobre preços",
      "Histórico de interações positivas"
    ],
    "recommendedActions": [
      "Agendar demonstração",
      "Enviar proposta personalizada"
    ],
    "nextFollowUp": "2026-03-19T14:00:00Z"
  }
}
```

---

## Integração WhatsApp

### Listar Conversas WhatsApp
```http
GET /whatsapp/conversations
```

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "conv-uuid",
      "phone": "+5511999999999",
      "contactName": "João Santos",
      "lastMessage": {
        "content": "Obrigado pelas informações!",
        "timestamp": "2026-03-18T10:30:00Z",
        "direction": "incoming"
      },
      "unreadCount": 2,
      "leadId": "lead-uuid"
    }
  ]
}
```

### Enviar Mensagem WhatsApp
```http
POST /whatsapp/send-message
```

**Parâmetros:**
```json
{
  "phone": "+5511999999999",
  "message": "Olá! Obrigado pelo seu interesse. Como posso ajudá-lo?",
  "type": "text",
  "leadId": "lead-uuid"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "messageId": "msg-uuid",
    "status": "sent",
    "timestamp": "2026-03-18T12:00:00Z"
  }
}
```

### Webhook WhatsApp
```http
POST /whatsapp/webhook
```

**Payload do Webhook:**
```json
{
  "event": "message",
  "data": {
    "messageId": "msg-uuid",
    "phone": "+5511999999999",
    "content": "Gostaria de saber mais sobre seus serviços",
    "timestamp": "2026-03-18T12:00:00Z",
    "type": "text"
  }
}
```

---

## Pipeline e Kanban

### Obter Pipeline
```http
GET /pipeline
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "stages": [
      {
        "id": "stage-1",
        "name": "Novo Lead",
        "order": 1,
        "color": "#3B82F6",
        "leadsCount": 25
      },
      {
        "id": "stage-2",
        "name": "Qualificado",
        "order": 2,
        "color": "#10B981",
        "leadsCount": 15
      },
      {
        "id": "stage-3",
        "name": "Em Negociação",
        "order": 3,
        "color": "#F59E0B",
        "leadsCount": 8
      },
      {
        "id": "stage-4",
        "name": "Fechado",
        "order": 4,
        "color": "#059669",
        "leadsCount": 12
      }
    ]
  }
}
```

### Mover Lead no Pipeline
```http
PATCH /leads/{leadId}/move
```

**Parâmetros:**
```json
{
  "stageId": "stage-3",
  "position": 2
}
```

---

## Automação e Templates

### Listar Templates de Mensagem
```http
GET /templates
```

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "template-1",
      "name": "Boas-vindas",
      "content": "Olá {{name}}! Obrigado pelo interesse em nossos serviços.",
      "variables": ["name"],
      "category": "boas-vindas",
      "createdAt": "2026-03-15T10:00:00Z"
    }
  ]
}
```

### Criar Automação
```http
POST /automations
```

**Parâmetros:**
```json
{
  "name": "Follow-up Automático",
  "trigger": {
    "type": "lead_status_change",
    "conditions": {
      "status": "qualificado"
    }
  },
  "actions": [
    {
      "type": "send_whatsapp",
      "delay": 3600,
      "templateId": "template-1"
    },
    {
      "type": "schedule_follow_up",
      "delay": 86400
    }
  ],
  "isActive": true
}
```

---

## Relatórios e Analytics

### Métricas Gerais
```http
GET /analytics/overview
```

**Parâmetros de Query:**
- `startDate` (ISO date): Data inicial
- `endDate` (ISO date): Data final
- `groupBy` (string): day, week, month

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalLeads": 1250,
      "newLeadsToday": 35,
      "conversionRate": 12.5,
      "averageScore": 68
    },
    "leadsbyStatus": {
      "novo": 350,
      "qualificado": 200,
      "em_negociacao": 150,
      "fechado": 300,
      "perdido": 250
    },
    "leadsBySource": {
      "whatsapp": 800,
      "website": 300,
      "indicacao": 150
    },
    "performanceByPeriod": [
      {
        "date": "2026-03-15",
        "leads": 45,
        "conversions": 8
      }
    ]
  }
}
```

### Relatório de Performance de Usuários
```http
GET /analytics/users-performance
```

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "userId": "user-1",
      "name": "Maria Silva",
      "leadsAssigned": 50,
      "leadsConverted": 12,
      "conversionRate": 24.0,
      "averageResponseTime": 120,
      "totalInteractions": 180
    }
  ]
}
```

---

## Notificações

### Listar Notificações
```http
GET /notifications
```

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-1",
      "type": "new_lead",
      "title": "Novo lead recebido",
      "message": "João Santos demonstrou interesse",
      "isRead": false,
      "createdAt": "2026-03-18T10:30:00Z",
      "data": {
        "leadId": "lead-uuid"
      }
    }
  ]
}
```

### Marcar como Lida
```http
PATCH /notifications/{notificationId}/read
```

---

## Gestão de Equipe

### Listar Usuários
```http
GET /users
```

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-1",
      "name": "Maria Silva",
      "email": "maria@empresa.com",
      "role": "manager",
      "isActive": true,
      "lastLogin": "2026-03-18T09:00:00Z",
      "permissions": ["leads.view", "leads.edit", "reports.view"]
    }
  ]
}
```

### Criar Usuário
```http
POST /users
```

**Parâmetros:**
```json
{
  "name": "Pedro Santos",
  "email": "pedro@empresa.com",
  "role": "agent",
  "permissions": ["leads.view", "leads.edit"],
  "password": "senha123"
}
```

---

## Integrações Externas

### Configurar Webhook
```http
POST /webhooks
```

**Parâmetros:**
```json
{
  "url": "https://sua-aplicacao.com/webhook",
  "events": ["lead.created", "lead.updated", "message.received"],
  "secret": "sua-chave-secreta"
}
```

### Exportar Leads
```http
GET /leads/export
```

**Parâmetros de Query:**
- `format` (string): csv, excel
- `dateFrom` (ISO date)
- `dateTo` (ISO date)
- `status` (string)

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://api.leadmasterai.com/downloads/leads-export-123.csv",
    "expiresAt": "2026-03-18T18:00:00Z"
  }
}
```

---

## Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 401 | Não autorizado |
| 403 | Acesso negado |
| 404 | Não encontrado |
| 409 | Conflito |
| 422 | Entidade não processável |
| 500 | Erro interno do servidor |

## Estrutura de Erro Padrão

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados de entrada inválidos",
    "details": [
      {
        "field": "email",
        "message": "E-mail é obrigatório"
      }
    ]
  }
}
```

## Rate Limiting

- **Limite geral:** 1000 requisições por hora
- **Limite para WhatsApp:** 100 mensagens por minuto
- **Cabeçalhos de resposta:**
  - `X-RateLimit-Limit`: Limite total
  - `X-RateLimit-Remaining`: Requisições restantes
  - `X-RateLimit-Reset`: Timestamp do reset

## Compliance LGPD

### Exportar Dados do Lead
```http
GET /leads/{leadId}/export-data
```

### Excluir Dados do Lead
```http
DELETE /leads/{leadId}/gdpr-delete
```

**Resposta (200):**
```json
{
  "success": true,
  "message":

---
*Tipo: api*
*Gerado pelo ForgeAI em 18/03/2026*
