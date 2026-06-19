const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = "realestate123";

// Meta webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// DM receive karo aur Make.com ko bhejo
app.post('/webhook', async (req, res) => {
  const body = req.body;
  console.log('DM aaya:', JSON.stringify(body));

  // Make.com webhook URL yahan dalna
  const MAKE_WEBHOOK_URL = "YAHAN_APNA_MAKE_WEBHOOK_URL_DALO";

  try {
    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.error('Make.com error:', err);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chal raha hai port ${PORT} pe`));
