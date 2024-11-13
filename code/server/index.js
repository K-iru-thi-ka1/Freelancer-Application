import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { Application, Chat, Freelancer, Project, User } from './Schema.js';
import { Server } from 'socket.io';
import http from 'http';
import SocketHandler from './SocketHandler.js';

const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

io.on("connection", (socket) => {
    console.log("User connected");
    SocketHandler(socket);
});

const PORT = 6001;

mongoose.connect('mongodb://localhost:27017/Freelancing', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');

    // Register Endpoint
    app.post('/register', async (req, res) => {
        try {
            const { username, email, password, usertype } = req.body;

            const salt = await bcrypt.genSalt();
            const passwordHash = await bcrypt.hash(password, salt);

            const newUser = new User({
                username,
                email,
                password: passwordHash,
                usertype
            });

            const user = await newUser.save();

            if (usertype === 'freelancer') {
                const newFreelancer = new Freelancer({
                    userId: user._id
                });
                await newFreelancer.save();
            }

            res.status(200).json(user);

        } catch (err) {
            console.error(err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // Login Endpoint
    app.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            // Find the user by email
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({ msg: "User does not exist" });
            }

            // Compare the provided password with the stored hashed password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: "Invalid credentials" });
            }

            // If login is successful, return user details (excluding sensitive information)
            const { password: _, ...userWithoutPassword } = user.toObject();
            res.status(200).json(userWithoutPassword);

        } catch (err) {
            console.error(err.message);
            res.status(500).json({ error: "Server error" });
        }
    });

    // Fetch Freelancer
    app.get('/fetch-freelancer/:id', async (req, res) => {
        try {
            const freelancer = await Freelancer.findOne({ userId: req.params.id });
            res.status(200).json(freelancer);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Update Freelancer
    app.post('/update-freelancer', async (req, res) => {
        const { freelancerId, updateSkills, description } = req.body;
        try {
            const freelancer = await Freelancer.findById(freelancerId);

            let skills = updateSkills.split(',');
            freelancer.skills = skills;
            freelancer.description = description;

            await freelancer.save();
            res.status(200).json(freelancer);

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Fetch Project by ID
    app.get('/fetch-project/:id', async (req, res) => {
        try {
            const project = await Project.findById(req.params.id);
            res.status(200).json(project);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Fetch All Projects
    app.get('/fetch-projects', async (req, res) => {
        try {
            const projects = await Project.find();
            res.status(200).json(projects);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Create New Project
    app.post('/new-project', async (req, res) => {
        const { title, description, budget, skills, clientId, clientName, clientEmail } = req.body;
        try {
            const projectSkills = skills.split(',');
            const newProject = new Project({
                title,
                description,
                budget,
                skills: projectSkills,
                clientId,
                clientName,
                clientEmail,
                postedDate: new Date()
            });
            await newProject.save();
            res.status(200).json({ message: "Project added" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Fetch All Applications
    app.get('/fetch-applications', async (req, res) => {
        try {
            const applications = await Application.find();
            res.status(200).json(applications);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Fetch All Users
    app.get('/fetch-users', async (req, res) => {
        try {
            const users = await User.find();
            res.status(200).json(users);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Fetch Chats by ID
    app.get('/fetch-chats/:id', async (req, res) => {
        try {
            const chats = await Chat.findById(req.params.id);
            res.status(200).json(chats);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Start the Server
    server.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}).catch((err) => console.error(`Error in DB connection: ${err.message}`));
