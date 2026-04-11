import { test, expect } from "@playwright/test"
import { loginAsAdmin } from "./helpers/auth"

test.describe("Kanban Pipeline", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByTestId("link-kanban").click()
    await page.waitForURL("**/kanban")
  })

  test("deve exibir título do kanban", async ({ page }) => {
    await expect(page.getByTestId("heading-kanban")).toBeVisible()
    await expect(page.getByText("Arraste os leads entre os estágios")).toBeVisible()
  })

  test("deve exibir colunas do pipeline", async ({ page }) => {
    // Verifica que as colunas do pipeline são carregadas
    await expect(page.getByText("Novo Lead")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("Contatado")).toBeVisible()
    await expect(page.getByText("Qualificado")).toBeVisible()
  })

  test("deve exibir contadores nas colunas", async ({ page }) => {
    // Aguarda carregamento e verifica que as colunas existem
    await page.waitForTimeout(2000)
    const columns = page.locator("[data-testid^='kanban-column-']")
    await expect(columns.first()).toBeVisible()
    const count = await columns.count()
    expect(count).toBeGreaterThan(0)
  })
})
