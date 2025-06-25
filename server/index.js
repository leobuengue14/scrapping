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
    
    // Create data table if it doesn't exist
    createDataTable();
  } else {
    console.log('Supabase credentials not configured, running in demo mode');
  }
} catch (error) {
  console.log('Failed to initialize Supabase client, running in demo mode');
}

// Function to create data table
async function createDataTable() {
  try {
    console.log('Ensuring data table exists...');
    
    // Try to insert a test record to see if table exists
    const testRecord = {
      product_id: '00000000-0000-0000-0000-000000000000',
      source_id: '00000000-0000-0000-0000-000000000000',
      name: 'test',
      price: '0',
      url: 'test',
      scraped_at: new Date().toISOString()
    };
    
    const { error: insertError } = await supabase
      .from('data')
      .insert([testRecord]);
    
    if (insertError && insertError.code === 'PGRST204') {
      console.log('Data table does not exist. Please create it manually with:');
      console.log(`
        CREATE TABLE IF NOT EXISTS data (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            product_id UUID REFERENCES product_catalog(id) ON DELETE CASCADE,
            source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
            name VARCHAR(500) NOT NULL,
            price VARCHAR(100),
            url TEXT NOT NULL,
            image TEXT,
            scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    } else if (insertError) {
      console.log('Data table exists but has different structure:', insertError);
    } else {
      console.log('Data table exists and is working correctly');
      // Delete the test record
      await supabase
        .from('data')
        .delete()
        .eq('name', 'test');
    }
  } catch (error) {
    console.log('Data table check completed with error:', error.message);
  }
}

// Import scraping modules
const sportingScraper = require('./scrapers/sporting');
const TiendaRiverScraper = require('./scrapers/tiendariver');
const DiaScraper = require('./scrapers/dia');
const CotoScraper = require('./scrapers/coto');
const soloFutbolScraper = require('./scrapers/solofutbol');

// Create instances for scrapers
const tiendaRiverScraper = TiendaRiverScraper;
const diaScraper = new DiaScraper();
const cotoScraper = new CotoScraper();

// In-memory storage for demo mode
let demoProducts = [];
let demoSources = [];
let demoData = [];

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
      // Demo mode
      const index = demoSources.findIndex(s => s.id === id);
      if (index !== -1) {
        demoSources.splice(index, 1);
      }
    }
    
    res.json({ message: 'Source deleted successfully' });
  } catch (error) {
    console.error('Error deleting source:', error);
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

// Endpoint to delete all sources
app.delete('/api/sources/all', async (req, res) => {
  try {
    if (getDataSource() === 'supabase') {
      const { error } = await supabase
        .from('sources')
        .delete()
        .gte('id', '0'); // Delete all sources

      if (error) throw error;
    } else {
      // Demo mode - clear all sources
      demoSources.length = 0;
    }
    
    res.json({ message: 'All sources deleted successfully' });
  } catch (error) {
    console.error('Error deleting all sources:', error);
    res.status(500).json({ error: 'Failed to delete all sources' });
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
    
    const { selectedProductIds } = req.body;
    
    if (!selectedProductIds || selectedProductIds.length === 0) {
      return res.status(400).json({ error: 'No products selected for scraping' });
    }

    // Get sources for selected products
    let allSources = [];
    if (getDataSource() === 'supabase') {
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('sources')
        .select('*')
        .in('product_id', selectedProductIds);

      if (sourcesError) throw sourcesError;
      allSources = sourcesData;
    } else {
      // Demo mode - filter sources by product_id if available
      allSources = demoSources.filter(source => 
        selectedProductIds.includes(source.product_id)
      );
    }

    console.log(`Found ${allSources.length} sources to scrape for ${selectedProductIds.length} selected products`);

    // Send initial progress update with total count
    sendScrapingUpdate({
      type: 'scraping_started',
      totalCount: allSources.length,
      message: `Iniciando scraping de ${allSources.length} sources para ${selectedProductIds.length} productos`
    });

    const results = [];
    let currentIndex = 0;

    for (const source of allSources) {
      currentIndex++;
      try {
        console.log(`Processing source: ${source.name} (${source.url})`);
        
        // Send progress update with current product info
        sendScrapingUpdate({
          type: 'scraping_progress',
          source: source.name,
          currentIndex: currentIndex,
          totalCount: allSources.length,
          message: `Scrapeando source ${currentIndex} de ${allSources.length}: ${source.name}`
        });
        
        let scrapedData = null;

        // Route to appropriate scraper based on source type
        switch (source.type) {
          case 'sporting':
            console.log(`Using Sporting scraper for: ${source.url}`);
            scrapedData = await sportingScraper.scrape(source.url);
            break;
          case 'tiendariver':
            console.log(`Using TiendaRiver scraper for: ${source.url}`);
            scrapedData = await tiendaRiverScraper.scrape(source.url);
            break;
          case 'dia':
            console.log(`Using Dia scraper for: ${source.url}`);
            scrapedData = await diaScraper.scrape(source.url);
            break;
          case 'coto':
            console.log(`Using Coto scraper for: ${source.url}`);
            scrapedData = await cotoScraper.scrape(source.url);
            break;
          case 'solofutbol':
            console.log(`Using Solo Futbol scraper for: ${source.url}`);
            scrapedData = await soloFutbolScraper.scrape(source.url);
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
          
          const dataRecord = {
            product_id: source.product_id,
            source_id: source.id,
            name: scrapedData.name,
            price: scrapedData.price,
            url: scrapedData.url,
            image: scrapedData.image,
            scraped_at: new Date().toISOString()
          };

          if (getDataSource() === 'supabase') {
            // Insert into data table
            const { error: insertError } = await supabase
              .from('data')
              .insert([dataRecord]);
            if (insertError) throw insertError;
          } else {
            // Demo mode - store in memory
            if (!demoData) demoData = [];
            demoData.unshift({
              id: Date.now().toString(),
              ...dataRecord,
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

    console.log('Scraping completed. Results:', results);
    res.json({ results });
  } catch (error) {
    console.error('Error executing scraping:', error);
    sendScrapingUpdate({
      type: 'scraping_error',
      message: `Error general: ${error.message}`
    });
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

// Product Catalog endpoints
app.get('/api/product-catalog', async (req, res) => {
  try {
    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('product_catalog')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } else {
      // Demo mode - return in-memory data
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching product catalog:', error);
    res.status(500).json({ error: 'Failed to fetch product catalog' });
  }
});

app.post('/api/product-catalog', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Product name is required' });
    }

    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('product_catalog')
        .insert([{ name: name.trim() }])
        .select();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return res.status(400).json({ error: 'A product with this name already exists' });
        }
        throw error;
      }
      res.json(data[0]);
    } else {
      // Demo mode
      const newProduct = { 
        id: uuidv4(), 
        name: name.trim(), 
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      res.json(newProduct);
    }
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.delete('/api/product-catalog/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (getDataSource() === 'supabase') {
      const { error } = await supabase
        .from('product_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Endpoint to link sources to a product
app.put('/api/sources/:sourceId/link-product', async (req, res) => {
  try {
    const { sourceId } = req.params;
    const { productId } = req.body;
    
    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('sources')
        .update({ product_id: productId })
        .eq('id', sourceId)
        .select();

      if (error) throw error;
      res.json(data[0]);
    } else {
      // Demo mode
      const source = demoSources.find(s => s.id === sourceId);
      if (source) {
        source.product_id = productId;
      }
      res.json(source);
    }
  } catch (error) {
    console.error('Error linking source to product:', error);
    res.status(500).json({ error: 'Failed to link source to product' });
  }
});

// Endpoint to unlink sources from a product
app.put('/api/sources/:sourceId/unlink-product', async (req, res) => {
  try {
    const { sourceId } = req.params;
    
    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('sources')
        .update({ product_id: null })
        .eq('id', sourceId)
        .select();

      if (error) throw error;
      res.json(data[0]);
    } else {
      // Demo mode
      const source = demoSources.find(s => s.id === sourceId);
      if (source) {
        source.product_id = null;
      }
      res.json(source);
    }
  } catch (error) {
    console.error('Error unlinking source from product:', error);
    res.status(500).json({ error: 'Failed to unlink source from product' });
  }
});

// Endpoint to get sources for a specific product with latest prices
app.get('/api/product-catalog/:productId/sources', async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (getDataSource() === 'supabase') {
      // Get sources for the product
      const { data: sources, error: sourcesError } = await supabase
        .from('sources')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (sourcesError) throw sourcesError;

      // Get the latest price for each source from the products table
      const sourcesWithPrices = await Promise.all(
        sources.map(async (source) => {
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('price')
            .eq('source_id', source.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (productsError) {
            console.error(`Error fetching price for source ${source.id}:`, productsError);
            return { ...source, price: null };
          }

          return {
            ...source,
            price: products.length > 0 ? products[0].price : null
          };
        })
      );

      res.json(sourcesWithPrices);
    } else {
      // Demo mode
      const sources = demoSources.filter(s => s.product_id === productId);
      res.json(sources);
    }
  } catch (error) {
    console.error('Error fetching product sources:', error);
    res.status(500).json({ error: 'Failed to fetch product sources' });
  }
});

// Endpoint to get data grouped by product
app.get('/api/data', async (req, res) => {
  try {
    if (getDataSource() === 'supabase') {
      // Try to get data from the data table
      const { data: allData, error: dataError } = await supabase
        .from('data')
        .select(`
          *,
          product_catalog:product_id(name),
          sources:source_id(name, type, url)
        `)
        .order('scraped_at', { ascending: false });

      if (dataError) {
        if (dataError.code === 'PGRST204') {
          // Table doesn't exist
          return res.json({
            message: 'La tabla de datos no existe. Ejecuta el scraping primero para crear datos.',
            needsSetup: true,
            data: []
          });
        }
        throw dataError;
      }

      // Group by product and then by source
      const groupedData = {};
      
      allData.forEach(record => {
        const productId = record.product_id;
        const sourceId = record.source_id;
        
        if (!groupedData[productId]) {
          groupedData[productId] = {
            product_id: productId,
            product_name: record.product_catalog?.name || 'Unknown Product',
            sources: {}
          };
        }
        
        if (!groupedData[productId].sources[sourceId]) {
          groupedData[productId].sources[sourceId] = [];
        }
        
        groupedData[productId].sources[sourceId].push(record);
      });

      // Sort sources by price (highest first) and keep only the latest record per source
      Object.keys(groupedData).forEach(productId => {
        const product = groupedData[productId];
        Object.keys(product.sources).forEach(sourceId => {
          const sourceRecords = product.sources[sourceId];
          // Sort by scraped_at (newest first) and take the first one
          sourceRecords.sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
          product.sources[sourceId] = sourceRecords[0]; // Keep only the latest
        });
        
        // Convert sources object to array and sort by price (highest first)
        const sourcesArray = Object.values(product.sources);
        sourcesArray.sort((a, b) => {
          const priceA = parseFloat(a.price || '0');
          const priceB = parseFloat(b.price || '0');
          return priceB - priceA;
        });
        
        product.sources = sourcesArray;
      });

      res.json({
        data: Object.values(groupedData),
        needsSetup: false
      });
    } else {
      // Demo mode - return empty array for now
      res.json({
        data: [],
        needsSetup: false
      });
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data',
      details: error.message,
      needsSetup: true
    });
  }
});

// New endpoint to delete individual scraped record from data table
app.delete('/api/data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (getDataSource() === 'supabase') {
      const { error } = await supabase
        .from('data')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } else {
      // Demo mode - remove from memory
      demoData = demoData.filter(record => record.id !== id);
    }
    
    res.json({ message: 'Scraped record deleted successfully' });
  } catch (error) {
    console.error('Error deleting scraped record:', error);
    res.status(500).json({ error: 'Failed to delete scraped record' });
  }
});

// New endpoint to delete all scraped records by product name from data table
app.delete('/api/data/name/:productName', async (req, res) => {
  try {
    const { productName } = req.params;
    const decodedProductName = decodeURIComponent(productName);
    
    console.log('Delete request for scraped data with product name:', decodedProductName);
    
    if (getDataSource() === 'supabase') {
      // First, let's check how many records exist with this name
      const { data: existingRecords, error: checkError } = await supabase
        .from('data')
        .select('*')
        .eq('name', decodedProductName);
      
      if (checkError) {
        console.error('Error checking existing scraped records:', checkError);
        throw checkError;
      }
      
      console.log(`Found ${existingRecords.length} scraped records with name: "${decodedProductName}"`);
      
      // Now delete the records
      const { error } = await supabase
        .from('data')
        .delete()
        .eq('name', decodedProductName);

      if (error) {
        console.error('Error deleting scraped records:', error);
        throw error;
      }
      
      console.log(`Successfully deleted ${existingRecords.length} scraped records`);
    } else {
      // Demo mode - remove from memory
      const beforeCount = demoData.length;
      demoData = demoData.filter(record => record.name !== decodedProductName);
      const afterCount = demoData.length;
      console.log(`Demo mode: deleted ${beforeCount - afterCount} scraped records`);
    }
    
    res.json({ message: `All scraped records for "${decodedProductName}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting scraped records by name:', error);
    res.status(500).json({ error: 'Failed to delete scraped records by name' });
  }
});

// ===== LABELS ENDPOINTS =====

// Get all labels
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
      // Demo mode
      res.json([
        { id: 1, name: 'Oferta', color: '#EF4444' },
        { id: 2, name: 'Nuevo', color: '#10B981' },
        { id: 3, name: 'Popular', color: '#F59E0B' },
        { id: 4, name: 'Destacado', color: '#8B5CF6' }
      ]);
    }
  } catch (error) {
    console.error('Error fetching labels:', error);
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

// Create new label
app.post('/api/labels', async (req, res) => {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Label name is required' });
    }

    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('labels')
        .insert([{ name, color: color || '#3B82F6' }])
        .select();

      if (error) throw error;
      res.json(data[0]);
    } else {
      // Demo mode
      const newLabel = {
        id: Date.now(),
        name,
        color: color || '#3B82F6',
        created_at: new Date().toISOString()
      };
      res.json(newLabel);
    }
  } catch (error) {
    console.error('Error creating label:', error);
    res.status(500).json({ error: 'Failed to create label' });
  }
});

// Update label
app.put('/api/labels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Label name is required' });
    }

    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('labels')
        .update({ name, color, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) throw error;
      res.json(data[0]);
    } else {
      // Demo mode
      res.json({ id: parseInt(id), name, color });
    }
  } catch (error) {
    console.error('Error updating label:', error);
    res.status(500).json({ error: 'Failed to update label' });
  }
});

// Delete label
app.delete('/api/labels/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (getDataSource() === 'supabase') {
      const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }
    
    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    console.error('Error deleting label:', error);
    res.status(500).json({ error: 'Failed to delete label' });
  }
});

// Get labels for a specific product
app.get('/api/products/:productId/labels', async (req, res) => {
  try {
    const { productId } = req.params;

    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('product_labels')
        .select(`
          label_id,
          labels(id, name, color)
        `)
        .eq('product_id', productId);

      if (error) throw error;
      
      const labels = data.map(item => item.labels);
      res.json(labels);
    } else {
      // Demo mode
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching product labels:', error);
    res.status(500).json({ error: 'Failed to fetch product labels' });
  }
});

// Add labels to a product
app.post('/api/products/:productId/labels', async (req, res) => {
  try {
    const { productId } = req.params;
    const { labelIds } = req.body; // Array of label IDs

    if (!labelIds || !Array.isArray(labelIds)) {
      return res.status(400).json({ error: 'labelIds array is required' });
    }

    if (getDataSource() === 'supabase') {
      // First, remove existing labels for this product
      await supabase
        .from('product_labels')
        .delete()
        .eq('product_id', productId);

      // Then add the new labels
      if (labelIds.length > 0) {
        const productLabels = labelIds.map(labelId => ({
          product_id: productId,
          label_id: labelId
        }));

        const { error } = await supabase
          .from('product_labels')
          .insert(productLabels);

        if (error) throw error;
      }
    }
    
    res.json({ message: 'Product labels updated successfully' });
  } catch (error) {
    console.error('Error updating product labels:', error);
    res.status(500).json({ error: 'Failed to update product labels' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: ${getDataSource() === 'supabase' ? 'Production (Supabase)' : 'Demo (In-memory)'}`);
});