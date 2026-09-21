/**
 * 门店管理 - 新增门店闭环
 * 覆盖：登录 -> 门店列表 -> 新增门店 -> 表单提交 -> 列表检索校验
 * @author harlin
 */
import { test, expect } from '../fixtures/base-test';
import { openAppPage, expectListUsable, trySearchFirstInput } from '../helpers/e2e';

test.describe.configure({ mode: 'serial' });

/** 优先按 label，其次按 placeholder，最后回退到 .ant-form-item 文本定位 */
async function fillField(scope: any, label: RegExp, value: string): Promise<boolean> {
  const byLabel = scope.getByLabel(label).first();
  if ((await byLabel.count()) > 0) {
    await byLabel.fill(value);
    return true;
  }
  const byPlaceholder = scope.getByPlaceholder(label).first();
  if ((await byPlaceholder.count()) > 0) {
    await byPlaceholder.fill(value);
    return true;
  }
  const item = scope.locator('.ant-form-item').filter({ hasText: label }).first();
  if ((await item.count()) > 0) {
    const input = item.locator('input, textarea').first();
    if ((await input.count()) > 0) {
      await input.fill(value);
      return true;
    }
  }
  return false;
}

/** 把弹窗内仍是「请选择」的下拉项选中第一个可选项，避免必填校验卡住 */
async function fillEmptySelects(page: any, scope: any): Promise<void> {
  const selects = scope.locator('.ant-form-item .ant-select');
  const count = await selects.count();
  for (let i = 0; i < count; i++) {
    const sel = selects.nth(i);
    if (!(await sel.isVisible().catch(() => false))) continue;
    const text = (await sel.innerText().catch(() => '')).trim();
    if (text && !/请选择/.test(text)) continue;
    await sel.click().catch(() => {});
    const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
    if ((await option.count()) > 0) {
      await option.click().catch(() => {});
    }
  }
}

test('新增门店后可在门店列表中查询到', async ({ page }) => {
  const stamp = Date.now().toString().slice(-6);
  const storeName = `自动化门店${stamp}`;
  const storeCode = `AUTO${stamp}`;

  // 1. 登录并进入门店列表（openAppPage 内部已处理登录态）
  await openAppPage(page, '/store/list');
  await expectListUsable(page);

  // 2. 打开新增门店弹窗 / 抽屉
  const createBtn = page.getByRole('button', { name: /新增|新建|添加/ }).first();
  await expect(createBtn).toBeVisible({ timeout: 15000 });
  await createBtn.click();

  const dialog = page.locator('.ant-modal-content:visible, .ant-drawer-content:visible').first();
  await expect(dialog).toBeVisible({ timeout: 15000 });

  // 3. 填写门店信息（按线上简体文案匹配，缺失字段自动跳过）
  await fillField(dialog, /门店名称|门店名/, storeName);
  await fillField(dialog, /门店编码|门店编号|编码/, storeCode);
  await fillField(dialog, /联系人|负责人/, '自动化测试');
  await fillField(dialog, /联系电话|手机号|电话/, '13800000000');
  await fillField(dialog, /门店地址|详细地址|地址/, '自动化测试地址 1 号');
  await fillEmptySelects(page, dialog);

  // 4. 提交
  const submitBtn = dialog.getByRole('button', { name: /确定|确认|保存|提交|新增/ }).last();
  await expect(submitBtn).toBeVisible({ timeout: 10000 });
  await submitBtn.click();

  // 5. 等待结果：成功提示出现 或 弹窗关闭（二者其一即可）
  const success = page.locator('.ant-message-success, .ant-notification-notice-success').first();
  await Promise.race([
    success.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    dialog.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {}),
  ]);
  await expect(dialog).toBeHidden({ timeout: 15000 });

  // 6. 列表检索校验新建门店
  await trySearchFirstInput(page, storeName);
  const searchBtn = page.getByRole('button', { name: /筛选|搜索|查询/ }).first();
  if ((await searchBtn.count()) > 0) {
    await searchBtn.click().catch(() => {});
  }

  const row = page.locator('.ant-table-row').filter({ hasText: storeName }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await expect(row).toContainText(storeCode);
});
