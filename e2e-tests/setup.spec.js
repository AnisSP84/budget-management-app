const { test, expect } = require('@playwright/test');

//DRY reusuable function
async function fillRegistrationForm(page) {
  await page.goto('http://127.0.0.1:3000/register.html');

  await page.fill('#username', `user${Math.random(10)}`);
  await page.fill('#email', `btb@yahoo${Math.random(10)}.net`);
  await page.fill('#password', '123123123');
  await page.fill('#confirmPassword', '123123123');

  const question = await page.locator('#captchaQuestion').textContent();
  const match = question.match(/(\d+)\s*([+\-*/])\s*(\d+)/);

  const num1 = Number(match[1]);
  const num2 = Number(match[3]);

  let answer;

  switch (match[2]) {
    case '+':
      answer = num1 + num2;
      break;
    case '-':
      answer = num1 - num2;
      break;
    case '*':
      answer = num1 * num2;
      break;
    case '/':
      answer = num1 / num2;
      break;
  }

  await page.fill('#captchaInput', answer.toString());
  await page.getByRole('button', { name: 'Begin Journey' }).click();
}

//Page will redirect to index
test('User setup sucessfully with only country', async ({ page }) => {
  await fillRegistrationForm(page);
  await page.waitForURL(/setup/);
  await page.getByLabel('Country').selectOption('JP');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/index/);
});

//Page will redirect to index
test('User setup sucessfully with notifications disabled', async ({ page }) => {
  await fillRegistrationForm(page);
  await page.waitForURL(/setup/);
  await page.getByLabel('Country').selectOption('JP');
  await page.getByRole('checkbox', { name: 'Budget Notifications' }).uncheck();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/index/);
});

//Page will display an browser notification with error.
test('User setup unsuccessfully with invalid Warning threshold', async ({ page }) => {
  await fillRegistrationForm(page);
  await page.waitForURL(/setup/);
  await page.getByLabel('Country').selectOption('JP');
  await page.getByRole('spinbutton', { name: 'Warning Threshold (%)' }).fill('-10');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/setup/);
});
