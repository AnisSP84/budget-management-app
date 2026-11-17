const { test, expect } = require('@playwright/test');

//reusuable function
async function registerUser(page, override = {}) {
  const user = {
    username: `BobTheBuilder${Math.random(100)}`,
    email: `btb@yahoo${Math.random(100)}.net`,
    password: '123123123',
    confirmPassword: '123123123',
    captchaOffset: 0,
    ...override,
  };

  await page.goto('http://127.0.0.1:3000/register.html');

  await page.locator('#username').fill(user.username);
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.locator('#confirmPassword').fill(user.confirmPassword);

  const question = await page.locator('#captchaQuestion').textContent();

  const match = question?.match(/(\d+)\s*([+\-*/])\s*(\d+)/);

  if (!match) {
    throw new Error(`Unable to parse captcha: ${question}`);
  }

  const num1 = Number(match[1]);
  const operator = match[2];
  const num2 = Number(match[3]);

  let answer;

  switch (operator) {
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
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }

  await page.locator('#captchaInput').fill((answer + user.captchaOffset).toString());

  await page.getByRole('button', { name: 'Begin Journey' }).click();
}

//success test
test('User can register successfully', async ({ page }) => {
  await registerUser(page);

  await expect(page).toHaveURL(/setup/);
});

// error test 1
test('User fails to register due to password requirements', async ({ page }) => {
  await registerUser(page, {
    password: '123',
    confirmPassword: '123',
  });

  await expect(page.locator('#warningCard')).toHaveText(
    'Password must be at least 8 characters long',
  );
});

//error test 2
test('User fails to register due to failed captcha', async ({ page }) => {
  await registerUser(page, {
    captchaOffset: 1,
  });

  await expect(page.locator('#warningCard')).toHaveText(' Incorrect captcha. Please try again.');
});
