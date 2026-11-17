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
//function to allow login
const loginUser = () => {
  const loginForm = document.getElementById('loginForm');
  const warningCard = document.getElementById('warningCard');
  const warningText = document.getElementById('warningText');

  const callback = (responseStatus, responseData) => {
    if (responseStatus === 200) {
      if (responseData && responseData.token) {
        localStorage.setItem('token', responseData.token);
        window.location.href = 'index.html';
      }
    } else {
      // Show error and hide it again if they start typing
      warningCard.classList.remove('d-none');
      warningText.innerText = responseData.message || 'Invalid credentials. Please try again.';
    }
  };

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();

    // Hide previous warnings on new attempt
    warningCard.classList.add('d-none');

    const data = {
      username: document.getElementById('username').value.trim(),
      password: document.getElementById('password').value.trim(),
      rememberMe: document.getElementById('rememberMe').checked,
    };

    fetchMethod(currentUrl + '/api/auth/login', callback, 'POST', data);
    loginForm.reset();
  });
};

document.addEventListener('DOMContentLoaded', () => {
  togglePassword('password', 'togglePassword');
  loginUser();
});
