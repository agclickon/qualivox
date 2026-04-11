import { test, expect } from "@playwright/test"
import { loginAsAdmin } from "./helpers/auth"

test.describe("Navegação e Layout", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test("deve exibir sidebar com itens de menu", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "LeadFlow" })).toBeVisible()
    await expect(page.getByTestId("link-dashboard")).toBeVisible()
    await expect(page.getByTestId("link-leads")).toBeVisible()
    await expect(page.getByTestId("link-kanban")).toBeVisible()
    await expect(page.getByTestId("link-whatsapp")).toBeVisible()
  })

  test("deve navegar para cada página via sidebar", async ({ page }) => {
    const pages = [
      { testId: "link-leads", heading: "heading-leads", url: "/leads" },
      { testId: "link-kanban", heading: "heading-kanban", url: "/kanban" },
      { testId: "link-whatsapp", heading: "heading-whatsapp", url: "/whatsapp" },
      { testId: "link-dashboard", heading: "heading-dashboard", url: "/dashboard" },
    ]

    for (const p of pages) {
      await page.getByTestId(p.testId).click()
      await page.waitForURL(`**${p.url}`)
      await expect(page.getByTestId(p.heading)).toBeVisible()
    }
  })

  test("deve alternar tema claro/escuro", async ({ page }) => {
    const themeToggle = page.getByTestId("toggle-theme")
    await expect(themeToggle).toBeVisible()

    // Clicar para alternar tema
    await themeToggle.click()
    await page.waitForTimeout(500)

    // Clicar novamente para voltar ao tema original
    await themeToggle.click()
    await page.waitForTimeout(500)
  })

  test("deve exibir dropdown do avatar com opções", async ({ page }) => {
    await page.getByTestId("button-avatar").click()

    await expect(page.getByTestId("dropdown-profile")).toBeVisible()
    await expect(page.getByTestId("dropdown-settings")).toBeVisible()
    await expect(page.getByTestId("dropdown-logout")).toBeVisible()
  })

  test("deve navegar para perfil via dropdown", async ({ page }) => {
    await page.getByTestId("button-avatar").click()
    await page.getByTestId("dropdown-profile").click()

    await expect(page).toHaveURL(/.*perfil/)
    await expect(page.getByTestId("heading-perfil")).toBeVisible()
  })

  test("deve navegar para configurações via dropdown", async ({ page }) => {
    await page.getByTestId("button-avatar").click()
    await page.getByTestId("dropdown-settings").click()

    await expect(page).toHaveURL(/.*configuracoes/)
    await expect(page.getByTestId("heading-configuracoes")).toBeVisible()
  })

  test("deve exibir botão de notificações no header", async ({ page }) => {
    await expect(page.getByTestId("button-notifications")).toBeVisible()
  })
})
