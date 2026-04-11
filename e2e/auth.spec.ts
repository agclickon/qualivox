import { test, expect } from "@playwright/test"
import { TEST_ADMIN, loginAsAdmin, logout } from "./helpers/auth"

test.describe("Autenticação", () => {
  test.describe("Página de Login", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login")
    })

    test("deve exibir formulário de login corretamente", async ({ page }) => {
      await expect(page.getByText("LeadFlow")).toBeVisible()
      await expect(page.getByText("Entre com suas credenciais")).toBeVisible()
      await expect(page.getByTestId("input-email")).toBeVisible()
      await expect(page.getByTestId("input-password")).toBeVisible()
      await expect(page.getByTestId("button-login")).toBeVisible()
      await expect(page.getByTestId("link-forgot-password")).toBeVisible()
      await expect(page.getByTestId("link-register")).toBeVisible()
    })

    test("deve mostrar erro com credenciais inválidas", async ({ page }) => {
      await page.getByTestId("input-email").fill("invalido@email.com")
      await page.getByTestId("input-password").fill("senhaerrada")
      await page.getByTestId("button-login").click()

      await expect(page.getByText("E-mail ou senha incorretos").first()).toBeVisible({ timeout: 10000 })
    })

    test("deve mostrar validação de campos obrigatórios", async ({ page }) => {
      await page.getByTestId("button-login").click()

      await expect(page.getByTestId("error-email")).toBeVisible()
      await expect(page.getByTestId("error-password")).toBeVisible()
    })

    test("deve alternar visibilidade da senha", async ({ page }) => {
      const passwordInput = page.getByTestId("input-password")
      await passwordInput.fill("minhasenha")
      await expect(passwordInput).toHaveAttribute("type", "password")

      await page.getByTestId("toggle-password").click()
      await expect(passwordInput).toHaveAttribute("type", "text")

      await page.getByTestId("toggle-password").click()
      await expect(passwordInput).toHaveAttribute("type", "password")
    })

    test("deve fazer login com credenciais válidas e redirecionar ao dashboard", async ({ page }) => {
      await loginAsAdmin(page)
      await expect(page).toHaveURL(/.*dashboard/)
      await expect(page.getByTestId("heading-dashboard")).toBeVisible()
    })

    test("deve navegar para página de cadastro", async ({ page }) => {
      await page.getByTestId("link-register").click()
      await expect(page).toHaveURL(/.*cadastro/)
    })

    test("deve navegar para esqueci senha", async ({ page }) => {
      await page.getByTestId("link-forgot-password").click()
      await expect(page).toHaveURL(/.*esqueci-senha/)
    })
  })

  test.describe("Página de Cadastro", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/cadastro")
    })

    test("deve exibir formulário de cadastro corretamente", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Criar Conta" })).toBeVisible()
      await expect(page.getByTestId("input-name")).toBeVisible()
      await expect(page.getByTestId("input-email")).toBeVisible()
      await expect(page.getByTestId("input-phone")).toBeVisible()
      await expect(page.getByTestId("input-password")).toBeVisible()
      await expect(page.getByTestId("input-confirm-password")).toBeVisible()
      await expect(page.getByTestId("checkbox-terms")).toBeVisible()
      await expect(page.getByTestId("button-register")).toBeVisible()
    })

    test("deve mostrar validação de campos obrigatórios", async ({ page }) => {
      await page.getByTestId("button-register").click()

      await expect(page.getByText("Nome deve ter no mínimo 2 caracteres")).toBeVisible()
      await expect(page.getByText("E-mail é obrigatório")).toBeVisible()
    })

    test("deve validar senhas que não coincidem", async ({ page }) => {
      await page.getByTestId("input-name").fill("Teste User")
      await page.getByTestId("input-email").fill("teste@teste.com")
      await page.getByTestId("input-password").fill("Senha123")
      await page.getByTestId("input-confirm-password").fill("Senha456")
      await page.getByTestId("checkbox-terms").check()
      await page.getByTestId("button-register").click()

      await expect(page.getByText("As senhas não coincidem")).toBeVisible()
    })

    test("deve alternar visibilidade da senha e confirmação", async ({ page }) => {
      const pwd = page.getByTestId("input-password")
      const confirm = page.getByTestId("input-confirm-password")

      await pwd.fill("teste")
      await confirm.fill("teste")

      await page.getByTestId("toggle-password").click()
      await expect(pwd).toHaveAttribute("type", "text")

      await page.getByTestId("toggle-confirm-password").click()
      await expect(confirm).toHaveAttribute("type", "text")
    })

    test("deve navegar para página de login", async ({ page }) => {
      await page.getByTestId("link-login").click()
      await expect(page).toHaveURL(/.*login/)
    })
  })

  test.describe("Esqueci minha senha", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/esqueci-senha")
    })

    test("deve exibir formulário de recuperação", async ({ page }) => {
      await expect(page.getByText("Esqueci minha senha")).toBeVisible()
      await expect(page.getByTestId("input-email")).toBeVisible()
      await expect(page.getByTestId("button-send-email")).toBeVisible()
    })

    test("deve enviar link de recuperação", async ({ page }) => {
      await page.getByTestId("input-email").fill("admin@leadflow.com")
      await page.getByTestId("button-send-email").click()

      await expect(page.getByRole("heading", { name: "E-mail enviado!" })).toBeVisible({ timeout: 10000 })
      await expect(page.getByTestId("button-back-login")).toBeVisible()
    })

    test("deve validar e-mail obrigatório", async ({ page }) => {
      await page.getByTestId("button-send-email").click()
      await expect(page.getByText("E-mail é obrigatório")).toBeVisible()
    })
  })

  test.describe("Logout", () => {
    test("deve fazer logout e redirecionar ao login", async ({ page }) => {
      await loginAsAdmin(page)
      await logout(page)
      await expect(page).toHaveURL(/.*login/)
    })
  })

  test.describe("Proteção de Rotas", () => {
    test("deve redirecionar para login ao acessar rota protegida sem autenticação", async ({ page }) => {
      await page.goto("/dashboard")
      await expect(page).toHaveURL(/.*login/)
    })

    test("deve redirecionar para dashboard se logado e acessar login", async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto("/login")
      await expect(page).toHaveURL(/.*dashboard/)
    })
  })
})
