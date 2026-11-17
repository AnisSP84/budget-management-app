// eslint-disable-next-line no-unused-vars
function getToken() {
  const token = localStorage.getItem('token');

  // if (!token) {
  //   window.location.href = 'index.html';
  //   return null;
  // }

  return token;
}
