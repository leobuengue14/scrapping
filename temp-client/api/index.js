// This file serves as the entry point for Vercel serverless functions
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for Vercel
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://*.vercel.app', 'https://*.vercel.app'] // Allow all Vercel domains
    : ['http://localhost:3000', 'http://localhost:5001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint for Vercel
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Supabase client with error handling
let supabase = null;
try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized successfully');
  } else {
    console.log('Supabase credentials not configured, running in demo mode');
  }
} catch (error) {
  console.log('Failed to initialize Supabase client, running in demo mode');
}

// In-memory storage for demo mode
let demoProducts = [];
let demoSources = [];
let demoData = [];

// Helper function to get data source
const getDataSource = () => {
  return supabase ? 'supabase' : 'demo';
};

// Basic routes for demo
app.get('/api/products', async (req, res) => {
  try {
    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('product_catalog')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } else {
      res.json(demoProducts);
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/sources', async (req, res) => {
  try {
    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } else {
      res.json(demoSources);
    }
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

app.get('/api/data', async (req, res) => {
  try {
    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('data')
        .select('*')
        .order('scraped_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } else {
      res.json(demoData);
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Labels endpoints
app.get('/api/labels', async (req, res) => {
  try {
    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('name');

      if (error) throw error;
      res.json(data);
    } else {
      res.json([
        { id: 1, name: 'Oferta', color: '#EF4444' },
        { id: 2, name: 'Nuevo', color: '#10B981' },
        { id: 3, name: 'Popular', color: '#F59E0B' }
      ]);
    }
  } catch (error) {
    console.error('Error fetching labels:', error);
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

// Export for Vercel
module.exports = app; 