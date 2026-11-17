// Toggle show/hide password
const togglePassword = (inputId, buttonId) => {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  const icon = button.querySelector('i');
  const text = button.querySelector('span');

  button.addEventListener('click', () => {
    const isHidden = input.type === 'password';

    // Toggle password visibility
    input.type = isHidden ? 'text' : 'password';

    // Toggle icon
    icon.classList.toggle('bi-eye', !isHidden);
    icon.classList.toggle('bi-eye-slash', isHidden);

    // Toggle button text
    text.textContent = isHidden ? 'Hide' : 'Show';
  });
};

// function to allow registration
const registerUser = () => {
  // Reference Signup Form, warning card + warning text
  const signupForm = document.getElementById('signupForm');
  const warningCard = document.getElementById('warningCard');
  const warningText = document.getElementById('warningText');

  // =========================
  // Simple Math CAPTCHA
  // =========================
  let captchaAnswer;

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;

    captchaAnswer = num1 + num2;

    document.getElementById('captchaQuestion').textContent = `${num1} + ${num2} = ?`;
    document.getElementById('captchaInput').value = '';
  };

  // Generate captcha when page loads
  generateCaptcha();

  // Refresh captcha button
  document.getElementById('refreshCaptcha').addEventListener('click', () => {
    generateCaptcha();
  });

  // Submit Event = Only run when Submit/Register Button is clicked
  signupForm.addEventListener('submit', (event) => {
    // Prevent windows default behavior when submitting
    event.preventDefault();

    // Referencing the input box values
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const captchaInput = parseInt(document.getElementById('captchaInput').value, 10);

    const MIN_USERNAME_LENGTH = 5;
    const MIN_PASSWORD_LENGTH = 8;

    // Username validation
    if (username.length < MIN_USERNAME_LENGTH) {
      warningCard.classList.remove('d-none');
      warningText.innerText = `Username must be at least ${MIN_USERNAME_LENGTH} characters long`;
      return;
    }

    // Password validation
    if (password.length < MIN_PASSWORD_LENGTH) {
      warningCard.classList.remove('d-none');
      warningText.innerText = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
      return;
    }

    // CAPTCHA validation
    // if (captchaInput !== captchaAnswer) {
    //   warningCard.classList.remove('d-none');
    //   warningText.innerText = 'Incorrect captcha. Please try again.';
    //   generateCaptcha();
    //   return;
    // }

    // Password match validation
    if (password !== confirmPassword) {
      warningCard.classList.remove('d-none');
      warningText.innerText = 'Passwords do not match';
      return;
    }

    // Hide previous alerts
    warningCard.classList.add('d-none');

    // Create data object to use in fetch methods
    const data = {
      captchaInput: captchaInput,
      captchaAnswer: captchaAnswer,
      username: username,
      email: email,
      password: password,
    };

    const callback = (responseStatus, responseData) => {
      if (responseStatus == 400) {
        warningCard.classList.remove('d-none');
        warningText.innerText = 'Incorrect captcha. Please try again.';
        generateCaptcha(); // only reset captcha
        return;
      }

      if (responseStatus == 200) {
        if (responseData.token) {
          // Store token
          localStorage.setItem('token', responseData.token);

          // Reset only after successful signup
          signupForm.reset();
          generateCaptcha();

          // Redirect user
          window.location.href = 'setup.html';
        }
      } else {
        warningCard.classList.remove('d-none');
        warningText.innerText = responseData.message;
      }
    };

    // Perform signup request
    fetchMethod(currentUrl + '/api/auth/register', callback, 'POST', data);

    // Reset form and generate a new captcha
    // signupForm.reset();
    // generateCaptcha();
  });
};

document.addEventListener('DOMContentLoaded', () => {
  registerUser();
  togglePassword('password', 'togglePassword');
  togglePassword('confirmPassword', 'toggleConfirmPassword');
});
