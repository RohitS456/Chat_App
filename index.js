// index.js

const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');


const app = express();
const server = http.createServer(app);
const io = new Server(server);

// MongoDB Connection and Schema
mongoose.connect('mongodb://localhost:27017/chatApp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('MongoDB connected successfully');
});

const chatSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});
const ChatMessage = mongoose.model('ChatMessage', chatSchema);

const chatRoomSchema = new mongoose.Schema({
  chatRoomId: String,
  chatRoomName: String,
  messages: [{
    username: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }]
});
const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

// Middleware
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.render('login.ejs');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Assuming username is authenticated
  res.redirect(`/dashboard?username=${username}`);
});

app.get('/dashboard', (req, res) => {
  const { username } = req.query;
  const chatRoomId = uuidv4();
  const chatRoomName = ''; // Set appropriate chat room name if needed
  res.render('home.ejs', { username, chatRoomName, chatRoomId });
});
app.get('/chatroom/:chatRoomId/history', async (req, res) => {
  const { chatRoomId } = req.params;

  try {
    // Find the chat room with the provided chatRoomId
    const chatRoom = await ChatRoom.findOne({ chatRoomId });

    if (!chatRoom) {
      return res.status(404).send('Chat room not found');
    }

    // Retrieve messages for the chat room
    const messages = await ChatMessage.find({ chatRoomId });

    // Render view.ejs with messages data
    res.render('view.ejs', { messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).send('Error fetching chat history');
  }
});

app.get('/room', (req, res) => {
  res.render('room.ejs');
});

app.post('/chatroom', (req, res) => {
  const { chatRoomName, members, username } = req.body;
  const chatRoomId = uuidv4();
  console.log("Chat Room ID:", chatRoomId);
  res.render('chatroom.ejs', { chatRoomName, members: JSON.parse(members), username, chatRoomId });
});

app.get('/api/chatroom/:chatRoomId/messages', async (req, res) => {
  const { chatRoomId } = req.params;
  try {
    const chatRoom = await ChatRoom.findOne({ chatRoomId });
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }
    res.json(chatRoom.messages);
  } catch (err) {
    console.error('Error retrieving messages:', err);
    res.status(500).send('Error retrieving messages');
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  // Listen for chat messages from client
  socket.on('chat message', async (msg) => {
    try {
      // Validate message format
      if (!msg.chatRoomId || !msg.username || !msg.message) {
        throw new Error('Invalid message format');
      }

      // Save message to MongoDB
      const newMessage = new ChatMessage({ username: msg.username, message: msg.message });
      await newMessage.save();

      // Find chat room and append message
      const filter = { chatRoomId: msg.chatRoomId };
      const update = { $push: { messages: { username: msg.username, message: msg.message } } };
      await ChatRoom.findOneAndUpdate(filter, update);

      // Emit message to all clients in the chat room
      io.to(msg.chatRoomId).emit('chat message', {
        username: msg.username,
        message: msg.message,
        timestamp: newMessage.timestamp.toLocaleString()
      });
    } catch (error) {
      console.error('Error handling chat message:', error.message);
      // Optionally, emit an error event or handle it accordingly
    }
  });

  // Listen for file share from client
  socket.on('share file', (fileInfo) => {
    io.emit('file shared', fileInfo); // Broadcast file info to all connected clients
  });
});
// Route to fetch chat history for a chat room
app.get('/view/:chatRoomId', async (req, res) => {
  const { chatRoomId } = req.params;
  try {
    const chatRoom = await ChatRoom.findOne({ chatRoomId });
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }
    // Pass messages to view.ejs template
    res.render('view.ejs', { messages: chatRoom.messages });
  } catch (err) {
    console.error('Error retrieving chat history:', err);
    res.status(500).send('Error retrieving chat history');
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
