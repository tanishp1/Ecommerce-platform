# E-Commerce Platform

A full-stack shopping app built with MongoDB, Express, React, and Node.js.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB with Mongoose
- Payments: Stripe checkout

## Features

- Product catalog with pricing and categories
- Shopping cart with quantity updates
- User registration and login
- Protected checkout flow
- Responsive storefront UI

## Getting started

1. Copy `.env.example` to `.env` and update the values.
2. Install dependencies:
   - `npm install`
   - `npm install --prefix client`
   - `npm install --prefix server`
3. Start the app:
   - `npm run dev`
4. Build for production:
   - `npm run build`

## Environment variables

- `PORT`: server port
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: secret key for JSON Web Tokens
- `STRIPE_SECRET_KEY`: Stripe secret for checkout session creation
- `CLIENT_URL`: frontend origin for CORS

## Project structure

- `client/` — React frontend
- `server/` — Express API and MongoDB integration

## Demo mode

If `STRIPE_SECRET_KEY` is not configured, the checkout endpoint returns a demo success payload instead of creating a live Stripe session.
