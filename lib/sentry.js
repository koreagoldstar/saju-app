const Sentry = require("@sentry/node");

let initialized = false;

function initSentry() {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  });
  initialized = true;
}

function captureException(error, extra) {
  if (!initialized) return;
  Sentry.captureException(error, { extra });
}

function captureMessage(message, extra) {
  if (!initialized) return;
  Sentry.captureMessage(message, { level: "warning", extra });
}

module.exports = {
  initSentry,
  captureException,
  captureMessage,
};