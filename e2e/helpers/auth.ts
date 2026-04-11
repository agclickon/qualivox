import { Page, expect } from "@playwright/test"

export const TEST_ADMIN = {
  email: "admin@leadflow.com",
  password: "admin123",
  name: "Rafael Costa",
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/login")
  await page.waitForLoadState("networkidle")
  await page.getByTestId("input-email").fill(TEST_ADMIN.email)
  await page.getByTestId("input-password").fill(TEST_ADMIN.password)
  await page.getByTestId("button-login").click()
  await page.waitForURL("**/dashboard", { timeout: 30000 })
  await page.waitForLoadState("networkidle")
  await expect(page.getByTestId("heading-dashboard")).toBeVisible({ timeout: 15000 })
}

export async function logout(page: Page) {
  await page.getByTestId("button-avatar").click()
  await page.getByTestId("dropdown-logout").click()
  await page.waitForURL("**/login")
}
