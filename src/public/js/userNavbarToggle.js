// Event: when page finishes loading ---> Than do something
document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('loginButton');
  const registerButton = document.getElementById('registerButton');
  const logoutButton = document.getElementById('logoutButton');

  // Check if token exists in local storage
  const token = localStorage.getItem('token');

  if (token) {
    // Token exists, show profile button and hide login and register buttons
    loginButton.classList.add('d-none'); //Add d-none --> Add display none property(hide)
    registerButton.classList.add('d-none');
    logoutButton.classList.remove('d-none');
  } else {
    // Token does not exist, show login and register buttons and hide profile and logout buttons
    loginButton.classList.remove('d-none');
    registerButton.classList.remove('d-none');
    logoutButton.classList.add('d-none');
  }

  //Logout Event
  logoutButton.addEventListener('click', () => {
    // Remove the token from local storage and redirect to index.html
    localStorage.removeItem('token');
    document.cookie = 'refreshToken=; Max-Age=0; path=/;';
    document.cookie = window.location.href = 'index.html';
  });
});
