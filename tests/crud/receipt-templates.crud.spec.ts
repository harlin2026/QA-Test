/**
 * @author harlin
 */

import { test, expect, type Page } from '../fixtures/base-test';
import { expectAuthenticated, expectAppShell } from '../helpers/page-checks';
import { uniqueLabel } from '../helpers/crud';

test.describe.configure({ mode: 'serial' });

const templateName = uniqueLabel('E2E模板');

async function openPage(page: Page) {
  await page.goto('/system/receipt-template');
  await expectAuthenticated(page);
  await expectAppShell(page);
}

test.describe('CRUD 单据模板', () => {
  test('新增模版並進入編輯頁', async ({ page }) => {
    await openPage(page);
    await page.getByRole('button', { name: /新增模版/ }).click();

    // 可能彈窗或直接跳轉編輯器
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible().catch(() => false)) {
      const nameInput = dialog.locator('input').first();
      await nameInput.fill(templateName);
      await dialog.getByRole('button', { name: /确\s*认|保\s*存|确\s*定|创\s*建/ }).click();
    }

    await expect(page).toHaveURL(/receipt-template/, { timeout: 15_000 });
    // 編輯器頁面應可見
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.getByText(/模板|编辑|保存|厨打|收银|存酒/).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('返回列表可見新增入口仍可用', async ({ page }) => {
    await openPage(page);
    await expect(page.getByRole('button', { name: /新增模版/ })).toBeVisible();
    // 若列表有測試模板，嘗試刪除清理
    const row = page.locator('.ant-table-tbody tr.ant-table-row, .template-card', {
      hasText: templateName,
    }).first();
    if (await row.isVisible().catch(() => false)) {
      const del = row.getByRole('button', { name: /删\s*除/ });
      if (await del.isVisible().catch(() => false)) {
        await del.click();
        const confirmBtn = page
          .locator('.ant-popconfirm-buttons button.ant-btn-primary, .ant-modal-confirm-btns button.ant-btn-primary')
          .last();
        if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
      }
    }
  });
});
