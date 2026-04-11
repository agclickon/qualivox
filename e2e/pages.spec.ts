import { test, expect } from "@playwright/test"
import { loginAsAdmin } from "./helpers/auth"

test.describe("Páginas do Sistema", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test.describe("Configurações", () => {
    test("deve exibir todas as seções de configuração", async ({ page }) => {
      await page.getByTestId("link-configuracoes").click()
      await page.waitForURL("**/configuracoes")

      await expect(page.getByTestId("heading-configuracoes")).toBeVisible()
      await expect(page.getByText("Geral").first()).toBeVisible()
      await expect(page.getByText("Aparência").first()).toBeVisible()
      await expect(page.getByText("Segurança & LGPD").first()).toBeVisible()
      await expect(page.getByText("Notificações").first()).toBeVisible()
      await expect(page.getByText("Integrações").first()).toBeVisible()
    })

    test("deve exibir seletor de tema com 3 opções", async ({ page }) => {
      await page.getByTestId("link-configuracoes").click()
      await page.waitForURL("**/configuracoes")

      await expect(page.getByText("Claro").first()).toBeVisible()
      await expect(page.getByText("Escuro").first()).toBeVisible()
      await expect(page.getByText("Sistema").first()).toBeVisible()
    })

    test("deve exibir cards de integrações", async ({ page }) => {
      await page.getByTestId("link-configuracoes").click()
      await page.waitForURL("**/configuracoes")

      await expect(page.getByText("WhatsApp (Evolution API)").first()).toBeVisible()
      await expect(page.getByText("N8N (Automações)").first()).toBeVisible()
      await expect(page.getByText("OpenAI (Qualificação IA)").first()).toBeVisible()
    })
  })

  test.describe("Relatórios", () => {
    test("deve exibir página de relatórios com KPIs", async ({ page }) => {
      await page.getByTestId("link-relatorios").click()
      await page.waitForURL("**/relatorios")

      await expect(page.getByTestId("heading-relatorios")).toBeVisible()
      await expect(page.getByText("Total Leads")).toBeVisible()
      await expect(page.getByText("Taxa Conversão")).toBeVisible()
      await expect(page.getByText("Score Médio")).toBeVisible()
    })

    test("deve exibir gráficos", async ({ page }) => {
      await page.getByTestId("link-relatorios").click()
      await page.waitForURL("**/relatorios")
      await page.waitForLoadState("networkidle")

      await expect(page.getByText("Funil de Vendas").first()).toBeVisible({ timeout: 20000 })
      await expect(page.getByText("Leads por Origem").first()).toBeVisible()
      await expect(page.getByText("Distribuição por Status").first()).toBeVisible()
    })
  })

  test.describe("Equipe", () => {
    test("deve exibir página de equipe com membros", async ({ page }) => {
      await page.getByTestId("link-equipe").click()
      await page.waitForURL("**/equipe")

      await expect(page.getByTestId("heading-equipe")).toBeVisible()
      await expect(page.getByText("Membros da Equipe")).toBeVisible()
    })
  })

  test.describe("Templates", () => {
    test("deve exibir página de templates", async ({ page }) => {
      await page.getByTestId("link-templates").click()
      await page.waitForURL("**/templates")

      await expect(page.getByTestId("heading-templates")).toBeVisible()
    })
  })

  test.describe("Notificações", () => {
    test("deve exibir página de notificações", async ({ page }) => {
      await page.getByTestId("link-notificacoes").click()
      await page.waitForURL("**/notificacoes")

      await expect(page.getByTestId("heading-notificacoes")).toBeVisible()
    })

    test("deve acessar notificações via header", async ({ page }) => {
      await page.getByTestId("button-notifications").click()
      await page.waitForURL("**/notificacoes")

      await expect(page.getByTestId("heading-notificacoes")).toBeVisible()
    })
  })

  test.describe("Automações", () => {
    test("deve exibir página de automações", async ({ page }) => {
      await page.getByTestId("link-automacoes").click()
      await page.waitForURL("**/automacoes")

      await expect(page.getByTestId("heading-automacoes")).toBeVisible()
    })
  })

  test.describe("WhatsApp", () => {
    test("deve exibir página do WhatsApp com conversas", async ({ page }) => {
      await page.getByTestId("link-whatsapp").click()
      await page.waitForURL("**/whatsapp")

      await expect(page.getByTestId("heading-whatsapp")).toBeVisible()
    })
  })

  test.describe("Chat Interno", () => {
    test("deve exibir página de chat com canais", async ({ page }) => {
      await page.getByTestId("link-chat").click()
      await page.waitForURL("**/chat")

      await expect(page.getByTestId("heading-chat")).toBeVisible()
      await expect(page.getByText("geral").first()).toBeVisible()
      await expect(page.getByText("vendas").first()).toBeVisible()
      await expect(page.getByText("suporte").first()).toBeVisible()
    })
  })

  test.describe("Responsividade", () => {
    test("deve exibir menu mobile em tela pequena", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto("/dashboard")
      await page.waitForURL("**/dashboard", { timeout: 30000 })
      await page.waitForLoadState("networkidle")

      await expect(page.getByTestId("button-menu-toggle")).toBeVisible()
    })
  })
})
