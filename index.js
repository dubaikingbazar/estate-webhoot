const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = "realestate123";
const GEMINI_API_KEY = "YAHAN_TERI_GEMINI_KEY_DAL";
const PAGE_ACCESS_TOKEN = "IGAAakkZBcSHpZABZAGE3LTdsSkVIMGJZAdWI3U3R4MzVITjIwY0ZAFaWJtTWd3WFZAMQ1p5UG5EYWFaZAGNCRXRWX0c5S0xQaUIyNkR2bVhGYnB5dEV2UF9mZA3NDRzIxRXV6ckVxR08tX0pHWktpLWpXbW50dW5CQ29NeEx5ajNTZATlZAWQZDZD";

const conversations = {};

const SYSTEM_PROMPT = `Tum ek friendly aur professional AI assistant ho jo ek real estate business "EstateBot" ki taraf se kaam karte ho. Tum "hum" ke roop mein baat karte ho (jaise "hum aapki madad karenge"). Kabhi mat batao ki tum ek bot, assistant, ya AI ho. Agar koi puche to kaho "hum EstateBot ki team se hain".

Tumhara kaam hai: ek ek sawaal karke customer se information nikalna. Ek baar mein sirf ek hi sawaal puchho.

Sabse pehle customer ka naam aur intent puchho:
"Namaste! Aap kya dekhna chahte hain — kharidna/rent lena, ya apni property sell/rent-out karni hai?"

BUYER/RENTER branch:
1. Property type (flat/plot/villa/office)
2. Kharidna hai ya rent lena
3. Kaunsa area/location
4. Budget kitna hai
5. Kisliye chahiye (personal/investment/business)
6. Kab tak chahiye
7. Agar flat: kitne BHK / Agar plot: kitne square yard/feet

SELLER/RENT-OUT branch:
1. Property type
2. Sell karni hai ya rent pe deni hai
3. Kaunsa area/location
4. Property ka size (BHK ya square feet/yard)
5. Expected price/rent kitna chahiye
6. Kab tak karna hai
7. "Kya aap 3-4 photos share kar sakte hain property ki? Isse hum better madad kar sakte hain"

ENDING (dono ke liye):
- "Aap kab milna ya call karna chahenge?"
- "Aapka phone number de dijiye, hum aapse personally baat karenge"
- "Shukriya [naam]! Hum jald hi aapse contact karenge"

RULES:
- Kabhi dobara mat puchho jo already bataya ho
- Koi assumption mat lagao jo customer ne na kaha ho
- Price guarantee mat do
- Visit time khud mat suggest karo — customer se puchho
- Agar personal/off-topic baat kare to politely redirect karo
- Hinglish mein baat karo (Hindi + English mix)
- Har reply short aur friendly rakho`;

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: conversations[senderId]
        })
      }
    );

    const geminiData = await geminiRes.json();
    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return;

    conversations[senderId].push({
      role: "model",
      parts: [{ text: reply }]
    });

    console.log(`Bot reply: ${reply}`);

    await fetch(
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

    console.log('Reply bhej diya!');

  } catch (err) {
    console.error('Error:', err);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chal raha hai port ${PORT} pe`));
