const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Stripe = require('stripe');
require('dotenv').config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 5000;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const products = [
  { id: 1, name: 'Aurora Headphones', category: 'Audio', price: 149, rating: 4.8, image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80', description: 'Wireless over-ear headphones with studio-grade sound and deep bass.' },
  { id: 2, name: 'Luma Smartwatch', category: 'Wearables', price: 199, rating: 4.7, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80', description: 'Track workouts, heart rate, and messages with a sleek titanium frame.' },
  { id: 3, name: 'Terra Lamp', category: 'Home', price: 89, rating: 4.9, image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', description: 'Create a warm ambient glow with a minimalist, modern lighting design.' },
  { id: 4, name: 'Nova Backpack', category: 'Travel', price: 119, rating: 4.6, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', description: 'Water-resistant carry system with multiple compartments for everyday travel.' },
  { id: 5, name: 'Pixel Camera', category: 'Photography', price: 499, rating: 4.9, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80', description: 'High-performance mirrorless camera for creators who shoot every day.' },
  { id: 6, name: 'Sora Chair', category: 'Furniture', price: 259, rating: 4.8, image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', description: 'Minimal ergonomic chair designed for comfort during long work sessions.' }
];

let users = [];

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true
  })
);
app.use(express.json());

async function connectMongoDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce';
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (error) {
    console.warn('MongoDB unavailable, using demo mode:', error.message);
  }
}

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'demo-secret', {
    expiresIn: '7d'
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'E-commerce API is running' });
});

app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password.' });
  }

  const existingUser = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now(),
    name,
    email,
    password: passwordHash
  };

  users.push(newUser);

  const token = generateToken(newUser);
  return res.status(201).json({
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = users.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = generateToken(user);
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

app.post('/api/checkout', async (req, res) => {
  const { cart, email } = req.body;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ message: 'Your cart is empty.' });
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!stripe) {
    return res.json({
      success: true,
      message: 'Demo checkout complete',
      total: subtotal,
      checkoutUrl: 'https://example.com/demo-checkout',
      customerEmail: email || 'guest@example.com'
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: cart.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100)
        },
        quantity: item.quantity
      })),
      metadata: {
        email: email || 'guest@example.com'
      },
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/?checkout=success`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/?checkout=cancelled`
    });

    return res.json({ success: true, checkoutUrl: session.url, total: subtotal });
  } catch (error) {
    return res.status(500).json({ message: 'Stripe checkout failed.', error: error.message });
  }
});

connectMongoDB();

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
