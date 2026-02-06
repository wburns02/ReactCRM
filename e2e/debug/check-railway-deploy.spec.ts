import { test, expect } from "@playwright/test";

/**
 * Check Railway deployment status for react-crm-api
 */
test("Check Railway deployment status", async ({ page }) => {
  // Go to Railway
  await page.goto("https://railway.com/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  console.log("Current URL:", page.url());
  await page.screenshot({ path: "e2e/screenshots/railway-deploy-1.png" });

  // If we need to login
  if (page.url().includes("login") || page.url().includes("auth")) {
    console.log("Need to login to Railway");
    // Try GitHub OAuth
    const githubBtn = page.locator('text=GitHub').first();
    if (await githubBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await githubBtn.click();
      await page.waitForTimeout(5000);
      console.log("After GitHub click:", page.url());
      await page.screenshot({ path: "e2e/screenshots/railway-deploy-2.png" });
    }
  }

  await page.waitForTimeout(3000);
  console.log("Dashboard URL:", page.url());
  await page.screenshot({ path: "e2e/screenshots/railway-deploy-3.png" });

  // Try to find the project
  const projectLink = page.locator('text=react-crm-api').first();
  if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await projectLink.click();
    await page.waitForTimeout(3000);
    console.log("Project URL:", page.url());
    await page.screenshot({ path: "e2e/screenshots/railway-deploy-4.png" });
  } else {
    console.log("Could not find react-crm-api project link");
    // Try clicking any project
    const anyProject = page.locator('[data-testid="project-card"]').first();
    if (await anyProject.isVisible({ timeout: 3000 }).catch(() => false)) {
      await anyProject.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: "e2e/screenshots/railway-deploy-4.png" });
  }

  // Look for deployment info, build logs
  await page.screenshot({ path: "e2e/screenshots/railway-deploy-5.png", fullPage: true });

  // Try to find deployments section
  const deploymentsLink = page.locator('text=Deployments').first();
  if (await deploymentsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await deploymentsLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "e2e/screenshots/railway-deploy-6.png", fullPage: true });
  }

  // Try to get deployment logs
  const viewLogs = page.locator('text=View Logs').first();
  if (await viewLogs.isVisible({ timeout: 3000 }).catch(() => false)) {
    await viewLogs.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "e2e/screenshots/railway-deploy-7.png", fullPage: true });
  }

  // Get all visible text for debugging
  const bodyText = await page.locator("body").innerText();
  console.log("Page content (first 3000 chars):", bodyText.substring(0, 3000));
});
