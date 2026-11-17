function fetchMethod(url, callback, method = 'GET', data = null, token = null) {
  const headers = {};

  // If there's data, convert data to JSON format
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  // If there's token, convert token to Bearer Token
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  let options = {
    method: method.toUpperCase(),
    headers: headers,
  };

  // If your method is not GET and there's data, change data to JSON format
  if (method.toUpperCase() !== 'GET' && data !== null) {
    options.body = JSON.stringify(data);
  }

  // finally, send the actual fetch with all this settings
  fetch(url, options)
    .then((response) => {
      if (response.status == 204) {
        callback(response.status, {});
      } else {
        //if 204, no content, just show the status
        response.json().then((responseData) => callback(response.status, responseData));
      }
    })
    .catch((error) => console.error(`Error from ${method} ${url}:`, error));
}
