import { expect, test } from '@playwright/test';

test('admin route presents Supabase authentication instead of a client-only password', async ({
  page,
}) => {
  await page.goto('/#/admin');
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  await expect(page.getByLabel('Admin email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
});
