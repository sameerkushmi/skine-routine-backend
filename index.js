require('dotenv/config')
const connectDB = require('./config/db')
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

// ================== Connect Database ==================
connectDB()

// ================== Express App ==================
const app = express()

// ================== CORS & Cookie ==================
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
app.use(cookieParser());

// ================== JSON Middleware ==================
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ================== Routes ==================
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/user', require('./routes/userRoutes'))
app.use('/api/products', require('./routes/productRoutes'))

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))