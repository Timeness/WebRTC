const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/room/:room', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', socket => {
  socket.on('join', room => {
    socket.join(room);
    socket.to(room).emit('user-connected', socket.id);

    socket.on('offer', data => {
      socket.to(room).emit('offer', data);
    });

    socket.on('answer', data => {
      socket.to(room).emit('answer', data);
    });

    socket.on('candidate', data => {
      socket.to(room).emit('candidate', data);
    });

    socket.on('disconnect', () => {
      socket.to(room).emit('user-disconnected', socket.id);
    });
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
