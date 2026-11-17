document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');

  const callback = (responseStatus, responseData) => {
    if (responseData.token) {
      localStorage.setItem('token', responseData.token);
    }
  };

  fetchMethod(currentUrl + '/api/auth/refresh', callback, 'POST', null, token);
});
