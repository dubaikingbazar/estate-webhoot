const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = "realestate123";
const GEMINI_API_KEY = "AQ.Ab8RN6JyYORbSaF6NnA58IZBqT8Dt2YkBseWG4L7qxka6gOlmQ";
const PAGE_ACCESS_TOKEN = "IGAAakkZBcSHpZABZAGE3LTdsSkVIMGJZAdWI3U3R4MzVITjIwY0ZAFaWJtTWd3WFZAMQ1p5UG5EYWFaZAGNCRXRWX0c5S0xQaUIyNkR2bVhGYnB5dEV2UF9mZA3NDRzIxRXV6ckVxR08tX0pHWktpLWpXbW50dW5CQ29NeEx5ajNTZATlZAWQZDZD";

const conversations = {};

const SYSTEM_PROMPT = `Tum ek friendly aur professional AI assistant ho jo ek real estate business "EstateBot" ki taraf se kaam karte ho. Tum "hum" ke roop mein baat karte ho. Kabhi mat batao ki tum bot ho. Ek baar mein sirf ek sawaal puchho.

Pehle puchho: "Namaste! Aap kya dekhna chahte hain — kharidna/rent lena, ya apni property sell/rent-out karni hai?"

BUYER: property type, area, budget, BHK/size, kab chahiye, phone number
SELLER: property type, area, size, expected price, timeline, photos mangna, phone number

RULES: Hinglish mein baat karo. Short friendly replies. Dobara mat puchho jo already bataya. Price guarantee mat do.`;

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

app.post('/webhook', async (req, res) => {
  const body = req.body;
  res.sendStatus(200);

  try {
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging) return;

    const senderId = messaging.sender.id;
    const userMessage = messaging.message?.text;
    if (!userMessage) return;

    console.log(`DM aaya from ${senderId}: ${userMessage}`);

    if (!conversations[senderId]) conversations[senderId] = [];
    conversations[senderId].push({
      role: "user",
      parts: [{ text: userMessage }]
    });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GEMINI_API_KEY}`
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: conversations[senderId]
        })
      }
    );

    const geminiData = await geminiRes.json();
    console.log('Gemini response:', JSON.stringify(geminiData));

    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      console.log('Gemini reply nahi aaya');
      return;
    }

    conversations[senderId].push({
      role: "model",
      parts: [{ text: reply }]
    });

    console.log(`Bot reply: ${reply}`);

    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: senderId },
          message: { text: reply }
        })
      }
    );

    const igData = await igRes.json();
    console.log('Instagram reply result:', JSON.stringify(igData));

  } catch (err) {
    console.error('Error:', err);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chal raha hai port ${PORT} pe`));
