const express = require('express');
const createError = require('http-errors');
const path = require('path');
const app = express();
const cookieParser = require('cookie-parser');
const cookieSecretKey = process.env.COOKIE_SECRET_KEY;

app.use(cookieParser(cookieSecretKey));
// Parse incoming JSON request bodies (e.g. from POST/PUT requests)
app.use(express.json());

// Serve static files (HTML, CSS, JS, images) from the 'public' folder.
// e.g. src/public/index.html is accessible at http://localhost:<port>/
app.use(express.static(path.join(__dirname, 'public')));

// Browsers automatically request /favicon.ico — return 204 (no content) to avoid 404 noise.
app.get('/favicon.ico', (req, res) => res.status(204).end());

const mainRoutes = require('./routers/mainRoutes');
app.use('/api', mainRoutes);

// 404 handler — if no route above matched the request,
// create a 404 error and pass it to the error handler below.
app.use((req, res, next) => {
  next(createError(404, `Unknown resource ${req.method} ${req.originalUrl}`));
});

// Global error handler — catches all errors thrown or passed via next(err).
// Sends a consistent JSON response instead of Express's default HTML error page.
// NOTE: Express requires exactly 4 parameters (error, req, res, next) to recognize
// this as an error handler. 'next' is not used here, so we disable the ESLint rule.

app.use((error, req, res, next) => {
  console.error(error);
  const status = error.status || 500;
  res.status(status).json({ error: error.message });
});

module.exports = app;
