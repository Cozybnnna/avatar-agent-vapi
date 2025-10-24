const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { WebSocketServer } = require('ws');
const http = require('http');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store connected clients
let wsClients = [];

// WebSocket Connection
wss.on('connection', (ws) => {
  console.log('✅ Client connected');
  wsClients.push(ws);

  ws.on('close', () => {
    wsClients = wsClients.filter(client => client !== ws);
    console.log('❌ Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Broadcast to all clients
function broadcast(data) {
  wsClients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

// Vapi Webhook - receives transcription events
app.post('/api/webhook', (req, res) => {
  try {
    const { transcribedText, isFinal, speaker } = req.body;

    console.log('📞 Webhook:', {
      text: transcribedText,
      final: isFinal,
      speaker: speaker
    });

    // Determine mouth shape from text
    const mouthShape = getMouthShape(transcribedText);

    // Send to all connected clients
    broadcast({
      action: 'updateMouth',
      mouth: mouthShape,
      text: transcribedText,
      isFinal: isFinal,
      speaker: speaker
    });

    res.json({ 
      status: 'ok', 
      mouthShape: mouthShape,
      clientsNotified: wsClients.length 
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Determine mouth position from phonetic
function getMouthShape(text) {
  if (!text) return 'Normal';

  const lastChar = text.slice(-1).toUpperCase();
  
  const phoneticMap = {
    'A': 'A',
    'Ä': 'A',
    'À': 'A',
    'Á': 'A',
    'E': 'E',
    'É': 'E',
    'È': 'E',
    'I': 'I',
    'Í': 'I',
    'Ï': 'I',
    'O': 'O',
    'Ö': 'O',
    'Ó': 'O',
    'U': 'U',
    'Ü': 'U',
    'Ú': 'U',
    'M': 'M',
    'B': 'M',
    'P': 'M',
    'F': 'E',
    'V': 'E',
    'S': 'I',
    'Z': 'I',
    'L': 'E',
  };

  return phoneticMap[lastChar] || 'Normal';
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend is running',
    connectedClients: wsClients.length
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
});

