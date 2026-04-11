# Guia de Estilos - Design System
> **FONTE ÚNICA DE VERDADE** para todos os estilos visuais do projeto.
> Este arquivo é a referência definitiva. Não consulte outros arquivos de estilos.

*Gerado pelo ForgeAI em 18/03/2026*

---

## 1. Paleta de Cores

### Modo de Cores: Light + Dark

O projeto utiliza **dois temas de cores**. O sistema deve implementar alternância entre Light e Dark.

#### Tema Light (Claro)

| Nome | Código Hex | Uso |
|------|------------|-----|
| **Background** | `#F0FDF4` | Fundo principal da aplicação |
| **Foreground** | `#064E3B` | Texto principal |
| **Primary** | `#10B981` | Botões principais, links, ações primárias |
| **Secondary** | `#34D399` | Botões secundários, elementos de apoio |
| **Accent** | `#D1FAE5` | Elementos de destaque sutil |
| **Muted** | `#D1FAE5` | Fundos suaves, estados desabilitados |
| **Muted Foreground** | `#064E3B99` | Texto secundário, placeholders |
| **Card** | `#F0FDF4` | Fundo de cartões e painéis |
| **Card Foreground** | `#064E3B` | Texto dentro de cartões |
| **Border** | `#064E3B20` | Bordas e divisores |
| **Destructive** | `#ef4444` | Erros e ações destrutivas |
| **Success** | `#22c55e` | Confirmações e sucesso |
| **Warning** | `#f59e0b` | Alertas e avisos |

#### Tema Dark (Escuro)

| Nome | Código Hex | Uso |
|------|------------|-----|
| **Background** | `#011813` | Fundo principal da aplicação |
| **Foreground** | `#D1FAE5` | Texto principal |
| **Primary** | `#34D399` | Botões principais, links, ações primárias |
| **Secondary** | `#6EE7B7` | Botões secundários, elementos de apoio |
| **Accent** | `#064E3B` | Elementos de destaque sutil |
| **Muted** | `#04251c` | Fundos suaves, estados desabilitados |
| **Muted Foreground** | `#D1FAE599` | Texto secundário, placeholders |
| **Card** | `#022C22` | Fundo de cartões e painéis |
| **Card Foreground** | `#D1FAE5` | Texto dentro de cartões |
| **Border** | `#D1FAE520` | Bordas e divisores |
| **Destructive** | `#dc2626` | Erros e ações destrutivas |
| **Success** | `#16a34a` | Confirmações e sucesso |
| **Warning** | `#d97706` | Alertas e avisos |

---

## 2. Variáveis CSS (Implementação)

Copie e cole estas variáveis CSS no seu projeto. **Use `var(--nome)`** para referenciar as cores.

```css
/* Tema Light (padrão) */
:root {
  --background: #F0FDF4;
  --foreground: #064E3B;
  --primary: #10B981;
  --primary-foreground: #ffffff;
  --secondary: #34D399;
  --secondary-foreground: #ffffff;
  --accent: #D1FAE5;
  --accent-foreground: #000000;
  --muted: #D1FAE5;
  --muted-foreground: #064E3B99;
  --card: #F0FDF4;
  --card-foreground: #064E3B;
  --border: #064E3B20;
  --destructive: #ef4444;
  --success: #22c55e;
  --warning: #f59e0b;
  --font-sans: Inter;
  --font-serif: Georgia;
  --font-heading: Inter;
  --font-mono: JetBrains Mono;
  --radius: 8px;
}

/* Tema Dark */
.dark,
[data-theme="dark"] {
  --background: #011813;
  --foreground: #D1FAE5;
  --primary: #34D399;
  --primary-foreground: #000000;
  --secondary: #6EE7B7;
  --secondary-foreground: #000000;
  --accent: #064E3B;
  --accent-foreground: #ffffff;
  --muted: #04251c;
  --muted-foreground: #D1FAE599;
  --card: #022C22;
  --card-foreground: #D1FAE5;
  --border: #D1FAE520;
  --destructive: #dc2626;
  --success: #16a34a;
  --warning: #d97706;
}
```

---

## 3. Tipografia

### Famílias de Fontes

| Família | Variável CSS | Uso |
|---------|-------------|-----|
| **Inter** | `--font-sans` | Fonte principal para textos e interface |
| **Georgia** | `--font-serif` | Textos longos, relatórios, destaques |
| **Inter** | `--font-heading` | Títulos e cabeçalhos |
| **JetBrains Mono** | `--font-mono` | Código, dados numéricos |

### Hierarquia de Tamanhos

**Tamanho Base**: `16px`
**Escala de Títulos**: `1.25x`

| Nível | Tamanho | Cálculo |
|-------|---------|---------|
| **H1** | `39px` | base x 1.25⁴ |
| **H2** | `31px` | base x 1.25³ |
| **H3** | `25px` | base x 1.25² |
| **H4** | `20px` | base x 1.25¹ |
| **Body** | `16px` | tamanho base |
| **Small** | `14px` | base x 0.875 |

---

## 4. Espaçamento

| Propriedade | Valor | Uso |
|-------------|-------|-----|
| **Border Radius** | `8px` | Cantos arredondados padrão |
| **Padding de Cards** | `20px` | Espaçamento interno de cartões |
| **Padding de Botões** | `12px` | Espaçamento interno de botões |

### Sistema de Espaçamento (baseado em 4px)

| Nome | Valor | Uso |
|------|-------|-----|
| **xs** | `4px` | Espaçamentos mínimos |
| **sm** | `8px` | Espaçamentos pequenos |
| **md** | `16px` | Espaçamento padrão |
| **lg** | `24px` | Espaçamentos grandes |
| **xl** | `32px` | Espaçamentos extra grandes |

---

## 5. Componentes

### Botão Primário
```css
.btn-primary {
  background-color: var(--primary);
  color: var(--primary-foreground);
  padding: 12px;
  border-radius: var(--radius);
  font-family: var(--font-sans);
}
```

### Botão Secundário
```css
.btn-secondary {
  background-color: var(--secondary);
  color: var(--secondary-foreground);
  padding: 12px;
  border-radius: var(--radius);
}
```

### Botão Outline
```css
.btn-outline {
  background-color: transparent;
  border: 1px solid var(--border);
  color: var(--foreground);
  padding: 12px;
  border-radius: var(--radius);
}
```

### Cartão
```css
.card {
  background-color: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}
```

### Input
```css
.input {
  background-color: var(--muted);
  color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
}
.input::placeholder {
  color: var(--muted-foreground);
}
.input:focus {
  border-color: var(--primary);
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}
```

### Badge
```css
.badge {
  background-color: var(--muted);
  color: var(--muted-foreground);
  padding: 4px 8px;
  border-radius: calc(var(--radius) / 2);
  font-size: 0.875rem;
}
```

---

## 6. Design Tokens (JSON)

```json
{
  "colorMode": "both",
  "colors": {
    "light": {
      "background": "#F0FDF4",
      "foreground": "#064E3B",
      "primary": "#10B981",
      "secondary": "#34D399",
      "accent": "#D1FAE5",
      "muted": "#D1FAE5",
      "mutedForeground": "#064E3B99",
      "card": "#F0FDF4",
      "cardForeground": "#064E3B",
      "border": "#064E3B20",
      "destructive": "#ef4444",
      "success": "#22c55e",
      "warning": "#f59e0b"
    },
    "dark": {
      "background": "#011813",
      "foreground": "#D1FAE5",
      "primary": "#34D399",
      "secondary": "#6EE7B7",
      "accent": "#064E3B",
      "muted": "#04251c",
      "mutedForeground": "#D1FAE599",
      "card": "#022C22",
      "cardForeground": "#D1FAE5",
      "border": "#D1FAE520",
      "destructive": "#dc2626",
      "success": "#16a34a",
      "warning": "#d97706"
    }
  },
  "typography": {
    "fontFamily": {
      "sans": "Inter",
      "serif": "Georgia",
      "heading": "Inter",
      "mono": "JetBrains Mono"
    },
    "fontSize": {
      "base": "16px",
      "headingScale": 1.25
    }
  },
  "spacing": {
    "borderRadius": "8px",
    "cardPadding": "20px",
    "buttonPadding": "12px"
  }
}
```

---

## 7. Regras de Uso

1. **SEMPRE** use variáveis CSS (`var(--nome)`) em vez de valores hexadecimais diretos
2. **NUNCA** invente cores fora desta paleta
3. Para texto principal, use `var(--foreground)`
4. Para texto secundário, use `var(--muted-foreground)`
5. Elementos interativos usam `var(--primary)` como cor de destaque
6. Bordas sempre com `var(--border)`
7. Implemente alternância entre temas Light e Dark

---

*Este é o arquivo de referência definitiva de estilos. Gerado pelo ForgeAI.*
