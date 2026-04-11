# Configuração do Banco de Dados - Gestão de lead com IA

## Opções de Banco de Dados

O projeto pode ser configurado com duas opções de banco de dados:

### Opção 1: Supabase (Recomendado para Produção)

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Copie a URL de conexão do banco (Connection String > URI)
3. Configure a variável de ambiente:
   ```
   SUPABASE_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   ```
4. Execute o schema:
   ```bash
   psql $SUPABASE_DATABASE_URL < infra/database/schema.sql
   ```

### Opção 2: PostgreSQL Local (Replit)

1. No Replit, use a ferramenta de criação de banco de dados
2. A variável `DATABASE_URL` será configurada automaticamente
3. Execute as migrações:
   ```bash
   npm run db:push
   ```

## Perguntas para o Agente fazer ao Usuário

Quando um agente de IA estiver configurando este projeto, deve perguntar:

1. **"Qual banco de dados você deseja usar?"**
   - Supabase (externo, recomendado para produção)
   - PostgreSQL local (Replit, para desenvolvimento)

2. **Se Supabase:** "Por favor, forneça a URL de conexão do Supabase (SUPABASE_DATABASE_URL)"

3. **Verificar credenciais:** Se as variáveis não estiverem no cofre, solicitar ao usuário

## Schema Básico Sugerido

Baseado no escopo do projeto, as principais tabelas são:

- `planejamento` - Dados relacionados a Planejamento
- `design` - Dados relacionados a Design
- `desenvolvimento` - Dados relacionados a Desenvolvimento
- `testes` - Dados relacionados a Testes
- `deploy` - Dados relacionados a Deploy

Veja o arquivo `schema.sql` para o schema completo.

---

*Gerado pelo ForgeAI*
