# Gestão de lead com IA

## INSTRUÇÕES OBRIGATÓRIAS PARA AGENTES DE IA

> **ATENÇÃO:** Este projeto foi gerado pelo ForgeAI e contém TODA a documentação necessária.
> **VOCÊ DEVE LER E SEGUIR TODAS AS DOCUMENTAÇÕES ANTES DE ESCREVER QUALQUER CÓDIGO.**
> 
> Estas instruções são compatíveis com: Replit Agent, Cursor, Windsurf, GitHub Copilot, e outros assistentes de IA.

---

## REGRAS FUNDAMENTAIS (NÃO VIOLAR)

1. **NÃO ESCREVA CÓDIGO** antes de ler toda a documentação
2. **NÃO INVENTE** cores, fontes ou estilos - use EXATAMENTE os definidos em `/styles`
3. **NÃO PROSSIGA** sem aprovação explícita do usuário
4. **SIGA** a arquitetura e padrões documentados em `PROMPT_TECNICO.md`

---

## FLUXO DE TRABALHO OBRIGATÓRIO

### FASE 1: Leitura Obrigatória (NÃO PULE ESTA ETAPA)

Você DEVE ler estes arquivos NA ORDEM antes de qualquer ação:

1. `PROMPT_TECNICO.md` - Especificações técnicas completas
2. `docs/01-briefing.md` - Contexto e requisitos do projeto
3. `docs/02-escopo.md` - Funcionalidades detalhadas
4. `docs/03-roadmap.md` - Fases e cronograma
5. `docs/04-wbs.md` - Estrutura analítica (tarefas)
6. `docs/guia-de-estilos.md` - **CORES, FONTES, ESPAÇAMENTOS E CSS - FONTE ÚNICA DE VERDADE**


### FASE 2: Planejamento (APRESENTE E AGUARDE APROVAÇÃO)

Após ler toda documentação, você DEVE:

1. **Criar um plano de execução** contendo:
   - Resumo do que será implementado
   - Funcionalidades principais (baseadas em `docs/02-escopo.md`)
   - Estrutura de pastas proposta
   - Tecnologias e dependências
   - Ordem de implementação por etapas
   - Design system que será usado (cores e fontes de `docs/guia-de-estilos.md`)

2. **APRESENTAR o plano ao usuário**

3. **AGUARDAR aprovação explícita** - Pergunte:
   > "O plano está aprovado? Posso iniciar a implementação?"

4. **NÃO PROSSIGA** sem resposta afirmativa ("sim", "aprovado", "pode iniciar")

### FASE 3: Configuração (após aprovação)

1. Pergunte sobre o banco de dados:
   > "Deseja usar banco externo (Supabase) ou banco local da plataforma?"

2. Configure variáveis de ambiente conforme `infra/environment/.env.example`

### FASE 4: Implementação (somente após aprovações)

1. Implemente seguindo a ordem do plano aprovado
2. **USE OBRIGATORIAMENTE** os estilos de `docs/guia-de-estilos.md`
3. Teste cada funcionalidade antes de prosseguir
4. Comunique o progresso ao usuário

---

## DESIGN SYSTEM - USO OBRIGATÓRIO

**FONTE ÚNICA DE VERDADE: `docs/guia-de-estilos.md`**

Você DEVE consultar EXCLUSIVAMENTE o arquivo `docs/guia-de-estilos.md` para:
- **Cores**: Paleta completa com variantes Light e Dark (se aplicável)
- **Tipografia**: Fontes, tamanhos e escalas
- **Espaçamento**: Border radius, padding de cards e botões
- **Variáveis CSS**: Copie as variáveis CSS prontas do guia
- **Componentes**: Estilos de botões, cards, inputs e badges

**REGRAS:**
1. **NÃO INVENTE CORES** - Use apenas os valores hex definidos no guia
2. **USE var(--nome)** - Sempre referencie cores via variáveis CSS
3. O guia especifica se o projeto usa Light, Dark ou ambos
4. Se ambos os temas, implemente alternância com classe `.dark`

---

## Stack do Projeto

**Stack Principal:** Personalizada (informar no briefing)

> **ATENÇÃO:** A arquitetura, estrutura de pastas e padrões de código para esta stack estão detalhados em `PROMPT_TECNICO.md` na seção "STACK TECNOLÓGICA".
> **SIGA EXATAMENTE** a estrutura de pastas e padrões especificados lá. NÃO invente sua própria estrutura.



---

## Estrutura de Arquivos do Export

```
/
├── PROMPT_TECNICO.md      # Especificações técnicas (LEIA PRIMEIRO!)
├── PROJECT_CHECKLIST.md   # Checklist de progresso
├── README.md              # Visão geral do projeto
├── replit.md              # Este arquivo de instruções
├── manifest.json          # Metadados do projeto
│
├── docs/                  # Documentação completa
│   ├── 01-briefing.md     # Contexto e requisitos
│   ├── 02-escopo.md       # Funcionalidades detalhadas
│   ├── 03-roadmap.md      # Fases e cronograma
│   ├── 04-wbs.md          # Estrutura analítica
│   └── guia-de-estilos.md # FONTE ÚNICA de estilos (cores, fontes, CSS)
│
├── infra/                 # Infraestrutura
│   ├── database/          # Schema e seeds SQL
│   └── environment/       # Variáveis de ambiente
│
└── src/                   # Código fonte (criar conforme PROMPT_TECNICO.md)
```



---

## Perguntas Obrigatórias ao Usuário

Antes de iniciar a implementação, você DEVE perguntar:

1. "Li toda a documentação. O plano de implementação está aprovado?"
2. "Qual banco de dados prefere: externo (Supabase) ou local da plataforma?"
3. Se externo: "Por favor, forneça a URL de conexão do banco"
4. "Há alguma funcionalidade prioritária que devo implementar primeiro?"

---

## FUNCIONALIDADES PADRÃO

> Além do escopo específico do projeto, as funcionalidades abaixo são OBRIGATÓRIAS em todos os projetos.
> Consulte a seção "FUNCIONALIDADES PADRÃO OBRIGATÓRIAS" no `PROMPT_TECNICO.md` para detalhes completos.

**Resumo das funcionalidades padrão:**
- Autenticação completa (login, cadastro, esqueci senha, olho para mostrar/esconder senha)
- Perfil do usuário (foto, nome, email, telefone, alterar senha)
- Hierarquia de usuários (super-admin, admin, usuário comum)
- Componentes UI da biblioteca escolhida (calendários, tabelas, formulários, toasts, skeletons)
- Layout responsivo (sidebar, header com avatar, toggle tema claro/escuro)
- Segurança (bcrypt, proteção de rotas, sessões seguras)

---

## QA E2E - TESTES AUTOMATIZADOS COM PLAYWRIGHT

Ao finalizar o desenvolvimento, você DEVE configurar testes E2E com Playwright:

### 1. Instalar Playwright

```bash
npm init playwright@latest
npx playwright install --with-deps chromium
```

### 2. Instalar Extensão Playwright no VS Code / Windsurf

- Abra o painel de extensões (Ctrl+Shift+X)
- Busque por **"Playwright Test for VSCode"** (ID: `ms-playwright.playwright`)
- Instale a extensão oficial da Microsoft
- Após instalar, a extensão adiciona:
  - Botão de play nos testes para execução individual
  - Painel "Testing" na sidebar com todos os testes
  - Debug integrado com breakpoints
  - Pick Locator para selecionar elementos na página

### 3. Configurar VS Code Tasks para Playwright

Crie o arquivo `.vscode/tasks.json` com as seguintes tasks:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Playwright: Rodar Todos os Testes",
      "type": "shell",
      "command": "npx playwright test",
      "group": {
        "kind": "test",
        "isDefault": true
      },
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Playwright: Rodar com UI Mode",
      "type": "shell",
      "command": "npx playwright test --ui",
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Playwright: Rodar Teste Atual",
      "type": "shell",
      "command": "npx playwright test ${relativeFile}",
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Playwright: Gerar Código (Codegen)",
      "type": "shell",
      "command": "npx playwright codegen http://localhost:3000",
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Playwright: Ver Relatório",
      "type": "shell",
      "command": "npx playwright show-report",
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    }
  ]
}
```

> Para executar: pressione **Ctrl+Shift+P** > "Tasks: Run Task" > escolha a task desejada.

### 4. Configurar Scripts no package.json

```json
{
  "scripts": {
    "test:e2e": "npx playwright test",
    "test:e2e:ui": "npx playwright test --ui",
    "test:e2e:headed": "npx playwright test --headed",
    "test:e2e:codegen": "npx playwright codegen http://localhost:3000",
    "test:e2e:report": "npx playwright show-report"
  }
}
```

### 5. Criar Testes E2E

- Criar testes para: login, dashboard, e todas as páginas CRUD do projeto
- **Usar `data-testid`** em todos os elementos interativos (botões, inputs, links)
- **Executar os testes** e corrigir todas as falhas antes de entregar

> Consulte a seção "QA E2E" no `PROMPT_TECNICO.md` para detalhes completos, configuração e exemplos.

---

## Comunicação

- Use **português brasileiro** em toda comunicação
- Seja claro e objetivo nas perguntas
- Informe o progresso a cada etapa concluída
- Em caso de dúvida, **PERGUNTE** antes de decidir

---

*Projeto gerado pelo ForgeAI - Estas instruções são obrigatórias*
