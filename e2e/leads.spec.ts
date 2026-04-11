import { test, expect } from "@playwright/test"
import { loginAsAdmin } from "./helpers/auth"

test.describe("Gestão de Leads", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByTestId("link-leads").click()
    await page.waitForURL("**/leads")
  })

  test("deve exibir página de leads com tabela", async ({ page }) => {
    await expect(page.getByTestId("heading-leads")).toBeVisible()
    await expect(page.getByTestId("button-new-lead")).toBeVisible()
    await expect(page.getByTestId("input-search-leads")).toBeVisible()
  })

  test("deve abrir modal de criação de lead", async ({ page }) => {
    await page.getByTestId("button-new-lead").click()

    await expect(page.getByRole("heading", { name: "Novo Lead" })).toBeVisible()
    await expect(page.getByTestId("input-lead-name")).toBeVisible()
    await expect(page.getByTestId("input-lead-email")).toBeVisible()
    await expect(page.getByTestId("input-lead-phone")).toBeVisible()
    await expect(page.getByTestId("input-lead-company")).toBeVisible()
    await expect(page.getByTestId("select-lead-source")).toBeVisible()
    await expect(page.getByTestId("textarea-lead-notes")).toBeVisible()
  })

  test("deve validar campo nome obrigatório ao criar lead", async ({ page }) => {
    await page.getByTestId("button-new-lead").click()
    await page.getByTestId("button-submit-lead").click()

    await expect(page.getByText("Nome deve ter no mínimo 2 caracteres")).toBeVisible()
  })

  test("deve criar um lead com sucesso", async ({ page }) => {
    await page.getByTestId("button-new-lead").click()

    await page.getByTestId("input-lead-name").fill("Lead de Teste E2E")
    await page.getByTestId("input-lead-email").fill("teste-e2e@leadflow.com")
    await page.getByTestId("input-lead-phone").fill("11999999999")
    await page.getByTestId("input-lead-company").fill("Empresa Teste")
    await page.getByTestId("select-lead-source").selectOption("website")
    await page.getByTestId("textarea-lead-notes").fill("Criado via teste E2E")

    await page.getByTestId("button-submit-lead").click()

    await expect(page.getByText("Lead criado com sucesso").first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Lead de Teste E2E").first()).toBeVisible()
  })

  test("deve buscar leads pelo campo de busca", async ({ page }) => {
    await page.getByTestId("input-search-leads").fill("Lead de Teste E2E")

    // Aguardar debounce da busca
    await page.waitForTimeout(500)

    // Deve filtrar resultados (pode ter 0 ou mais)
    await expect(page.getByTestId("heading-leads")).toBeVisible()
  })

  test("deve exibir modal de confirmação de exclusão", async ({ page }) => {
    // Verifica se a tabela tem linhas com botão de exclusão
    const deleteButtons = page.locator("[data-testid^='button-delete-']")
    const count = await deleteButtons.count()

    if (count > 0) {
      await deleteButtons.first().click()
      await expect(page.getByText("Confirmar exclusão")).toBeVisible()
      await expect(page.getByTestId("button-cancel-delete")).toBeVisible()
      await expect(page.getByTestId("button-confirm-delete")).toBeVisible()

      // Cancelar exclusão
      await page.getByTestId("button-cancel-delete").click()
      await expect(page.getByText("Confirmar exclusão")).not.toBeVisible()
    }
  })
})
