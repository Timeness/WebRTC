const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {};

wss.on('connection', ws => {
  ws.on('message', message => {
    const data = JSON.parse(message);

    if (data.join) {
      const room = data.join;
      rooms[room] = rooms[room] || [];
      rooms[room].push(ws);
      ws.room = room;
    }

    if (ws.room) {
      rooms[ws.room].forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  });

  ws.on('close', () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room] = rooms[ws.room].filter(client => client !== ws);
    }
  });
});

app.use(express.static('public'));

app.get('/room/:id', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
