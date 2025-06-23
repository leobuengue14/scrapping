const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Import scraping modules
const sportingScraper = require('./scrapers/sporting');
const TiendaRiverScraper = require('./scrapers/tiendariver');
const DiaScraper = require('./scrapers/dia');
const CotoScraper = require('./scrapers/coto');

// Create instances for scrapers
const tiendaRiverScraper = TiendaRiverScraper;
const diaScraper = new DiaScraper();
const cotoScraper = new CotoScraper();

// In-memory storage for demo mode
let demoProducts = [];
let demoSources = [];

// Store for SSE clients
let sseClients = [];

// Helper function to get data source
const getDataSource = () => {
  return supabase ? 'supabase' : 'demo';
};

// Routes
app.get('/api/products', async (req, res) => {
  try {
    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('scraped_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } else {
      // Demo mode - return in-memory data
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
      // Demo mode - return in-memory data
      res.json(demoSources);
    }
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

app.post('/api/sources', async (req, res) => {
  try {
    const { url, type } = req.body;
    // Extraer el nombre del producto del último segmento de la URL
    let productName = '';
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        let lastPart = pathParts[pathParts.length - 1];
        if (lastPart === 'p' && pathParts.length > 1) {
          lastPart = pathParts[pathParts.length - 2];
        }
        productName = lastPart.replace(/-/g, ' ').replace(/\d{5,}/g, '').replace(/\b\w{1,2}\b/g, '').replace(/\s+/g, ' ').trim();
        if (!productName) productName = lastPart.replace(/-/g, ' ');
      }
    } catch {}
    if (!productName) productName = 'Producto';
    const sourceType = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown';
    const name = `${sourceType} - ${productName}`;
    // Guardar en Supabase o demo
    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('sources')
        .insert([{ url, type, name }])
        .select();
      if (error) throw error;
      res.json(data[0]);
    } else {
      // Demo mode
      const newSource = { id: uuidv4(), url, type, name, created_at: new Date().toISOString() };
      demoSources.push(newSource);
      res.json(newSource);
    }
  } catch (error) {
    console.error('Error creating source:', error);
    res.status(500).json({ error: 'Failed to create source' });
  }
});

app.delete('/api/sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (getDataSource() === 'supabase') {
      const { error } = await supabase
        .from('sources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } else {
      // Demo mode - remove from memory
      demoSources = demoSources.filter(source => source.id !== id);
    }
    
    res.json({ message: 'Source deleted successfully' });
  } catch (error) {
    console.error('Error deleting source:', error);
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (getDataSource() === 'supabase') {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } else {
      // Demo mode - remove from memory
      demoProducts = demoProducts.filter(product => product.id !== id);
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// New endpoint to delete all products by name
app.delete('/api/products/name/:productName', async (req, res) => {
  try {
    const { productName } = req.params;
    const decodedProductName = decodeURIComponent(productName);
    
    console.log('Delete request for product name:', decodedProductName);
    
    if (getDataSource() === 'supabase') {
      // First, let's check how many records exist with this name
      const { data: existingProducts, error: checkError } = await supabase
        .from('products')
        .select('*')
        .eq('name', decodedProductName);
      
      if (checkError) {
        console.error('Error checking existing products:', checkError);
        throw checkError;
      }
      
      console.log(`Found ${existingProducts.length} products with name: "${decodedProductName}"`);
      
      // Now delete the products
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('name', decodedProductName);

      if (error) {
        console.error('Error deleting products:', error);
        throw error;
      }
      
      console.log(`Successfully deleted ${existingProducts.length} products`);
    } else {
      // Demo mode - remove from memory
      const beforeCount = demoProducts.length;
      demoProducts = demoProducts.filter(product => product.name !== decodedProductName);
      const afterCount = demoProducts.length;
      console.log(`Demo mode: deleted ${beforeCount - afterCount} products`);
    }
    
    res.json({ message: `All records for "${decodedProductName}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting products by name:', error);
    res.status(500).json({ error: 'Failed to delete products by name' });
  }
});

app.post('/api/execute', async (req, res) => {
  try {
    console.log('Execute endpoint called');
    
    const { sourceIds } = req.body;
    
    // Get all sources
    let allSources = [];
    if (getDataSource() === 'supabase') {
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('sources')
        .select('*');

      if (sourcesError) throw sourcesError;
      allSources = sourcesData;
    } else {
      allSources = demoSources;
    }

    // Filter sources based on selected IDs
    let sources = allSources;
    if (sourceIds && sourceIds.length > 0) {
      sources = allSources.filter(source => sourceIds.includes(source.id));
      console.log(`Filtered to ${sources.length} selected sources out of ${allSources.length} total`);
    }

    console.log(`Found ${sources.length} sources to scrape`);

    // Send initial progress update with total count
    sendScrapingUpdate({
      type: 'scraping_started',
      totalCount: sources.length,
      message: `Iniciando scraping de ${sources.length} productos`
    });

    const results = [];
    let currentIndex = 0;

    for (const source of sources) {
      currentIndex++;
      try {
        console.log(`Processing source: ${source.name} (${source.url})`);
        
        // Send progress update with current product info
        sendScrapingUpdate({
          type: 'scraping_progress',
          source: source.name,
          currentIndex: currentIndex,
          totalCount: sources.length,
          message: `Scrapeando producto ${currentIndex} de ${sources.length}: ${source.name}`
        });
        
        let scrapedData = null;

        // Route to appropriate scraper based on source type
        switch (source.type) {
          case 'sporting':
            console.log(`Using Sporting scraper for: ${source.url}`);
            sendScrapingUpdate({
              type: 'scraping_progress',
              source: source.name,
              message: `Usando scraper Sporting para: ${source.url}`
            });
            scrapedData = await sportingScraper.scrape(source.url);
            break;
          case 'tiendariver':
            console.log(`Using TiendaRiver scraper for: ${source.url}`);
            sendScrapingUpdate({
              type: 'scraping_progress',
              source: source.name,
              message: `Usando scraper TiendaRiver para: ${source.url}`
            });
            scrapedData = await tiendaRiverScraper.scrape(source.url);
            break;
          case 'dia':
            console.log(`Using Dia scraper for: ${source.url}`);
            sendScrapingUpdate({
              type: 'scraping_progress',
              source: source.name,
              message: `Usando scraper Dia para: ${source.url}`
            });
            scrapedData = await diaScraper.scrape(source.url);
            break;
          case 'coto':
            console.log(`Using Coto scraper for: ${source.url}`);
            sendScrapingUpdate({
              type: 'scraping_progress',
              source: source.name,
              message: `Usando scraper Coto para: ${source.url}`
            });
            scrapedData = await cotoScraper.scrape(source.url);
            break;
          default:
            console.warn(`No scraper found for type: ${source.type}`);
            sendScrapingUpdate({
              type: 'scraping_error',
              source: source.name,
              message: `No se encontró scraper para el tipo: ${source.type}`
            });
            continue;
        }

        if (scrapedData) {
          console.log(`Successfully scraped data:`, scrapedData);
          
          // Send success update
          sendScrapingUpdate({
            type: 'scraping_success',
            source: source.name,
            data: scrapedData,
            message: `✅ Scraping exitoso: ${scrapedData.name} - $${scrapedData.price}`
          });
          
          const productData = {
            name: scrapedData.name,
            price: scrapedData.price,
            source_url: source.url,
            source_name: source.name,
            source_type: source.type,
            image: scrapedData.image,
            scraped_at: new Date().toISOString()
          };

          if (getDataSource() === 'supabase') {
            // Always insert a new record (no update)
            const { error: insertError } = await supabase
              .from('products')
              .insert([productData]);
            if (insertError) throw insertError;
          } else {
            // Demo mode - always add a new record
            demoProducts.unshift({
              id: Date.now().toString(),
              ...productData,
              created_at: new Date().toISOString()
            });
          }

          results.push({
            source: source.name,
            status: 'success',
            data: scrapedData
          });
        }
      } catch (scrapeError) {
        console.error(`Error scraping ${source.name}:`, scrapeError);
        
        // Send error update
        sendScrapingUpdate({
          type: 'scraping_error',
          source: source.name,
          error: scrapeError.message,
          message: `❌ Error scraping ${source.name}: ${scrapeError.message}`
        });
        
        results.push({
          source: source.name,
          status: 'error',
          error: scrapeError.message
        });
      }
    }

    // Send completion update
    sendScrapingUpdate({
      type: 'scraping_completed',
      results: results,
      message: `🏁 Scraping completado. ${results.filter(r => r.status === 'success').length} exitosos, ${results.filter(r => r.status === 'error').length} errores`
    });

    console.log(`Scraping completed. Results:`, results);
    res.json({ results });
  } catch (error) {
    console.error('Error executing scraping:', error);
    res.status(500).json({ error: 'Failed to execute scraping' });
  }
});

// SSE endpoint for real-time scraping updates
app.get('/api/scraping-updates', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };

  sseClients.push(newClient);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connection', message: 'Connected to scraping updates' })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client.id !== clientId);
  });
});

// Helper function to send updates to all SSE clients
const sendScrapingUpdate = (update) => {
  sseClients.forEach(client => {
    client.res.write(`data: ${JSON.stringify(update)}\n\n`);
  });
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: ${getDataSource() === 'supabase' ? 'Production (Supabase)' : 'Demo (In-memory)'}`);
});