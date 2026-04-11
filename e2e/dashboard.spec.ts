import { test, expect } from "@playwright/test"
import { loginAsAdmin } from "./helpers/auth"

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test("deve exibir título e métricas do dashboard", async ({ page }) => {
    await expect(page.getByTestId("heading-dashboard")).toBeVisible()
    await expect(page.getByText("Total de Leads")).toBeVisible()
    await expect(page.getByText("Novos Hoje")).toBeVisible()
    await expect(page.getByText("Taxa de Conversão")).toBeVisible()
    await expect(page.getByText("Score Médio")).toBeVisible()
  })

  test("deve exibir seção de gráficos", async ({ page }) => {
    await expect(page.getByText("Leads por Status")).toBeVisible()
    await expect(page.getByText("Leads por Origem")).toBeVisible()
  })

  test("deve exibir seção de leads recentes", async ({ page }) => {
    await expect(page.getByText("Leads Recentes")).toBeVisible()
  })
})
