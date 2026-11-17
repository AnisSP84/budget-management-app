const { test, expect } = require('@playwright/test');

async function loginUser(page, override = {}) {
  const user = {
    username: 'testuser',
    password: '1234',
    ...override,
  };

  await page.goto('http://127.0.0.1:3000/login.html');

  await page.getByRole('textbox', { name: 'Username' }).fill(user.username);

  await page.getByRole('textbox', { name: 'Password' }).fill(user.password);

  await page.getByRole('button', { name: 'Login' }).click();
}

// sucess case 1
test('User can login successfully', async ({ page }) => {
  await loginUser(page);

  await expect(page).toHaveURL(/index/);
});

// unsuccess cas 1
test('User cannot login due to username being wrong', async ({ page }) => {
  await loginUser(page, {
    username: 'nonExistantUser',
  });

  await expect(page.locator('#warningCard')).toHaveText('User not found');
});

// unsuccess case 2
test('User cannot login due to incorrect password', async ({ page }) => {
  await loginUser(page, {
    password: '12345',
  });

  await expect(page.locator('#warningCard')).toHaveText('Wrong password');
});
