/**
 * Twilio Mock Server
 *
 * Simulates Twilio REST API endpoints for E2E testing.
 * NO REAL SMS ARE SENT - all messages are logged and stored in memory.
 *
 * Endpoints:
 * - POST /2010-04-01/Accounts/:accountSid/Messages.json - Send SMS
 * - GET /2010-04-01/Accounts/:accountSid/Messages/:sid.json - Get message
 * - POST /webhook/simulate - Simulate incoming webhook
 * - GET /health - Health check
 * - GET /messages - View all mock messages (debug)
 */

const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.MOCK_SERVER_PORT || 5010;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:5001/webhooks/twilio/incoming';

// In-memory message store
const messages = new Map();
const webhookCallbacks = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: 'mock',
    messageCount: messages.size,
    uptime: process.uptime(),
  });
});

// Send SMS (Mock)
// POST /2010-04-01/Accounts/:accountSid/Messages.json
app.post('/2010-04-01/Accounts/:accountSid/Messages.json', (req, res) => {
  const { accountSid } = req.params;
  const { To, From, Body, StatusCallback } = req.body;

  // Generate mock SID
  const sid = `SM_MOCK_${uuidv4().replace(/-/g, '').substring(0, 32)}`;

  const message = {
    sid,
    account_sid: accountSid,
    to: To,
    from: From,
    body: Body,
    status: 'sent',
    direction: 'outbound-api',
    date_created: new Date().toISOString(),
    date_sent: new Date().toISOString(),
    date_updated: new Date().toISOString(),
    price: '-0.0075',
    price_unit: 'USD',
    num_segments: '1',
    num_media: '0',
    status_callback: StatusCallback,
    mock: true,
  };

  messages.set(sid, message);

  console.log(`[MOCK SMS] To: ${To}, From: ${From}, Body: "${Body.substring(0, 50)}..."`);

  // Simulate status callback if provided
  if (StatusCallback) {
    setTimeout(async () => {
      try {
        const callbackData = new URLSearchParams({
          MessageSid: sid,
          MessageStatus: 'delivered',
          To,
          From,
          AccountSid: accountSid,
        });

        await fetch(StatusCallback, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: callbackData.toString(),
        });
        console.log(`[MOCK CALLBACK] Sent delivered status to ${StatusCallback}`);
      } catch (err) {
        console.log(`[MOCK CALLBACK] Failed: ${err.message}`);
      }
    }, 500);
  }

  // Return Twilio-like response
  res.status(201).json(message);
});

// Get message by SID
// GET /2010-04-01/Accounts/:accountSid/Messages/:sid.json
app.get('/2010-04-01/Accounts/:accountSid/Messages/:sid.json', (req, res) => {
  const { sid } = req.params;

  const message = messages.get(sid);

  if (!message) {
    return res.status(404).json({
      code: 20404,
      message: 'The requested resource was not found',
      status: 404,
    });
  }

  res.json(message);
});

// List messages
// GET /2010-04-01/Accounts/:accountSid/Messages.json
app.get('/2010-04-01/Accounts/:accountSid/Messages.json', (req, res) => {
  const allMessages = Array.from(messages.values());

  res.json({
    messages: allMessages.slice(0, 50), // Limit to 50
    page: 0,
    page_size: 50,
    total: allMessages.length,
  });
});

// Simulate incoming SMS webhook
// POST /webhook/simulate
app.post('/webhook/simulate', async (req, res) => {
  const { from, to, body } = req.body;

  const sid = `SM_MOCK_IN_${uuidv4().replace(/-/g, '').substring(0, 32)}`;

  const webhookPayload = {
    MessageSid: sid,
    AccountSid: 'AC_MOCK_TEST',
    From: from || '+15551234567',
    To: to || '+15559876543',
    Body: body || 'Mock incoming message',
    NumMedia: '0',
    FromCity: 'MOCK_CITY',
    FromState: 'TX',
    FromCountry: 'US',
  };

  // Store as incoming message
  messages.set(sid, {
    ...webhookPayload,
    direction: 'inbound',
    date_created: new Date().toISOString(),
    mock: true,
  });

  console.log(`[MOCK INCOMING] Simulating webhook to ${WEBHOOK_URL}`);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': 'mock_signature_for_testing',
        'X-Mock-Mode': 'true',
      },
      body: new URLSearchParams(webhookPayload).toString(),
    });

    const responseText = await response.text();

    res.json({
      success: true,
      webhookStatus: response.status,
      webhookResponse: responseText.substring(0, 500),
      messageSid: sid,
    });
  } catch (err) {
    res.json({
      success: false,
      error: err.message,
      messageSid: sid,
    });
  }
});

// Debug endpoint - view all messages
app.get('/messages', (req, res) => {
  const allMessages = Array.from(messages.values());
  res.json({
    total: allMessages.length,
    messages: allMessages,
  });
});

// Clear all messages (for test cleanup)
app.delete('/messages', (req, res) => {
  messages.clear();
  res.json({ success: true, message: 'All messages cleared' });
});

// Phone number lookup (mock)
// GET /2010-04-01/Accounts/:accountSid/IncomingPhoneNumbers.json
app.get('/2010-04-01/Accounts/:accountSid/IncomingPhoneNumbers.json', (req, res) => {
  res.json({
    incoming_phone_numbers: [
      {
        sid: 'PN_MOCK_12345',
        phone_number: '+15550001234',
        friendly_name: 'Mock CRM Number',
        capabilities: {
          sms: true,
          mms: true,
          voice: true,
        },
      },
    ],
  });
});

// Voice call (mock - just log it)
app.post('/2010-04-01/Accounts/:accountSid/Calls.json', (req, res) => {
  const { To, From, Url } = req.body;
  const sid = `CA_MOCK_${uuidv4().replace(/-/g, '').substring(0, 32)}`;

  console.log(`[MOCK CALL] To: ${To}, From: ${From}, TwiML: ${Url}`);

  res.status(201).json({
    sid,
    to: To,
    from: From,
    status: 'queued',
    direction: 'outbound-api',
    mock: true,
  });
});

// Catch-all for unhandled Twilio API routes
app.all('/2010-04-01/*', (req, res) => {
  console.log(`[MOCK] Unhandled route: ${req.method} ${req.path}`);
  res.status(200).json({
    mock: true,
    message: 'Mock endpoint - no real action taken',
    path: req.path,
    method: req.method,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('======================================');
  console.log('  TWILIO MOCK SERVER');
  console.log('  Mode: MOCK (no real SMS)');
  console.log(`  Port: ${PORT}`);
  console.log(`  Webhook URL: ${WEBHOOK_URL}`);
  console.log('======================================');
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST http://localhost:${PORT}/2010-04-01/Accounts/:sid/Messages.json`);
  console.log(`  GET  http://localhost:${PORT}/messages (debug)`);
  console.log(`  POST http://localhost:${PORT}/webhook/simulate`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log('');
});
