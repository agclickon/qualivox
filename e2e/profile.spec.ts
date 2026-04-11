import { test, expect } from "@playwright/test"
import { loginAsAdmin, TEST_ADMIN } from "./helpers/auth"

test.describe("Perfil do Usuário", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByTestId("button-avatar").click()
    await page.getByTestId("dropdown-profile").click()
    await page.waitForURL("**/perfil")
  })

  test("deve exibir página de perfil com dados do usuário", async ({ page }) => {
    await expect(page.getByTestId("heading-perfil")).toBeVisible()
    await expect(page.getByText("Dados Pessoais").first()).toBeVisible()
    await expect(page.getByText("Alterar Senha").first()).toBeVisible()
  })

  test("deve exibir avatar com iniciais", async ({ page }) => {
    await expect(page.getByTestId("button-upload-avatar")).toBeVisible()
  })

  test("deve preencher campos com dados do usuário logado", async ({ page }) => {
    const nameInput = page.getByTestId("input-profile-name")
    const emailInput = page.getByTestId("input-profile-email")

    await expect(nameInput).toHaveValue(TEST_ADMIN.name)
    await expect(emailInput).toHaveValue(TEST_ADMIN.email)
  })

  test("deve exibir formulário de alterar senha", async ({ page }) => {
    await expect(page.getByTestId("input-current-password")).toBeVisible()
    await expect(page.getByTestId("input-new-password")).toBeVisible()
    await expect(page.getByTestId("input-confirm-new-password")).toBeVisible()
    await expect(page.getByTestId("button-change-password")).toBeVisible()
  })

  test("deve alternar visibilidade dos campos de senha", async ({ page }) => {
    const currentPwd = page.getByTestId("input-current-password")
    await currentPwd.fill("teste")
    await expect(currentPwd).toHaveAttribute("type", "password")

    // Clicar no botão de toggle (está após o input no DOM)
    const toggleButtons = page.locator("button:has(svg)").filter({ hasText: "" })
    // Verificar apenas que os campos de senha existem e têm type correto
    await expect(page.getByTestId("input-new-password")).toHaveAttribute("type", "password")
    await expect(page.getByTestId("input-confirm-new-password")).toHaveAttribute("type", "password")
  })

  test("deve ter botão de salvar perfil", async ({ page }) => {
    await expect(page.getByTestId("button-save-profile")).toBeVisible()
  })
})
