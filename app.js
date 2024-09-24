const WebSocket = require('ws');
const express   = require('express');
const mongoose  = require('./mongoose');

const url  = require('url');
const cors = require('cors');
const bp   = require('body-parser');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('./model');
const { authenticateJWT } = require('./helper');

const app = express();
app.use(bp.json());
app.use(cors());

const JWT_SECRET = 'your_jwt_secret_key';

// mock data
// const users = [
//     {
//         username: 'blade',
//         password: "tur-kecaki",
//         authKey: "bbb-555"
//     },
//     {
//         username: "vampir",
//         password: "aruntxmem",
//         authKey: "vvv-666"
//     }
// ];

// post andpoint
app.post('/register', async (req, res) => {
    const { username, password, authKey } = req.body;

    if (!username || !password || !authKey) {
        return res.status(400).json({ success: false, msg: 'Invalid credentials' });
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, msg: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            password: hashedPassword,
            authKey
        });

        const savedUser = await newUser.save();
        const token = jwt.sign({ authKey }, JWT_SECRET, { expiresIn: '10h' });

        res.status(201).json({ success: true, token, data: { savedUser } });
    } catch (error) {
        res.status(500).json({ success: false, msg: 'Internal server error', error: error.message });
    }
});

// patch andpoint
app.patch('/api/users/:id', authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const { bio } = req.body;

    if (!id || !bio) {
        return res.status(400).json({ success: false, msg: 'Invalid credentials' });
    }

    try {
        const user = await User.findOneAndUpdate(
            { _id: id },
            { bio },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' }); 
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, msg: 'Internal server error', error: error.message });
    }
});

// auth andpoint
app.post('/api/auth', authenticateJWT, async (req, res) => {
    const { username, password } = req.body;

    const currentUser = await User.findOne({ username });
    if (currentUser && await bcrypt.compare(password, currentUser.password)) {
        return res.send({ authKey: currentUser.authKey });
    }

    res.status(401).send('No such user');
});

const server = new WebSocket.Server({ port: 4000 });
const clients = new Map();

server.on('connection', async (client, req) => {
    const { query } = url.parse(req.url, true);
    const { authKey } = query;

    const user = await User.findOne({ authKey });

    if (!user) {
        client.send("Unauthorized");
        client.close();
        return;
    }

    clients.set(user._id.toString(), client);
    client.send(`Welcome to chat, ${user.username}!`);

    client.on('message', async message => {
        const connectedUsers = await User.find();
        connectedUsers.forEach(dbUser => {
            const clientSocket = clients.get(dbUser._id.toString());
            
            if (clientSocket && user._id.toString() !== dbUser._id.toString()) {
                clientSocket.send(`From: ${user.username} > ${message.toString()}`);
            }
        });
    });

    client.on('close', () => {
        clients.delete(user._id.toString());
    });
});

app.listen(3000);