const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

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

// In-memory storage for demo mode
let demoProducts = [];
let demoSources = [];

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
    
    // Extract product name from URL
    let name = req.body.name;
    if (!name) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
        
        // For sporting.com.ar, extract the product identifier from the URL
        if (urlObj.hostname.includes('sporting.com.ar')) {
          // Get the last meaningful part of the URL path
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart !== 'p') {
            // Convert URL-friendly format to readable text
            name = lastPart
              .replace(/-/g, ' ')
              .replace(/\d+$/, '') // Remove trailing numbers
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          } else {
            // Fallback to a more generic name
            name = `Product from ${urlObj.hostname}`;
          }
        } else {
          name = `Product from ${urlObj.hostname}`;
        }
      } catch (urlError) {
        name = 'Unknown Product';
      }
    }
    
    if (getDataSource() === 'supabase') {
      const { data, error } = await supabase
        .from('sources')
        .insert([{ url, name, type }])
        .select();

      if (error) throw error;
      res.json(data[0]);
    } else {
      // Demo mode - store in memory
      const newSource = {
        id: Date.now().toString(),
        url,
        name,
        type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoSources.unshift(newSource);
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

app.post('/api/execute', async (req, res) => {
  try {
    console.log('Execute endpoint called');
    
    // Get all sources
    let sources = [];
    if (getDataSource() === 'supabase') {
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('sources')
        .select('*');

      if (sourcesError) throw sourcesError;
      sources = sourcesData;
    } else {
      sources = demoSources;
    }

    console.log(`Found ${sources.length} sources to scrape`);

    const results = [];

    for (const source of sources) {
      try {
        console.log(`Processing source: ${source.name} (${source.url})`);
        let scrapedData = null;

        // Route to appropriate scraper based on source type
        switch (source.type) {
          case 'sporting':
            console.log(`Using Sporting scraper for: ${source.url}`);
            scrapedData = await sportingScraper.scrape(source.url);
            break;
          default:
            console.warn(`No scraper found for type: ${source.type}`);
            continue;
        }

        if (scrapedData) {
          console.log(`Successfully scraped data:`, scrapedData);
          
          const productData = {
            name: scrapedData.name,
            price: scrapedData.price,
            source_url: source.url,
            source_name: source.name,
            scraped_at: new Date().toISOString()
          };

          if (getDataSource() === 'supabase') {
            // Check if product already exists
            const { data: existingProduct } = await supabase
              .from('products')
              .select('id')
              .eq('source_url', source.url)
              .single();

            if (existingProduct) {
              // Update existing product
              const { error: updateError } = await supabase
                .from('products')
                .update(productData)
                .eq('id', existingProduct.id);

              if (updateError) throw updateError;
            } else {
              // Insert new product
              const { error: insertError } = await supabase
                .from('products')
                .insert([productData]);

              if (insertError) throw insertError;
            }
          } else {
            // Demo mode - store in memory
            const existingIndex = demoProducts.findIndex(p => p.source_url === source.url);
            if (existingIndex >= 0) {
              demoProducts[existingIndex] = { ...demoProducts[existingIndex], ...productData };
            } else {
              demoProducts.unshift({
                id: Date.now().toString(),
                ...productData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          }

          results.push({
            source: source.name,
            status: 'success',
            data: scrapedData
          });
        }
      } catch (scrapeError) {
        console.error(`Error scraping ${source.name}:`, scrapeError);
        results.push({
          source: source.name,
          status: 'error',
          error: scrapeError.message
        });
      }
    }

    console.log(`Scraping completed. Results:`, results);
    res.json({ results });
  } catch (error) {
    console.error('Error executing scraping:', error);
    res.status(500).json({ error: 'Failed to execute scraping' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: ${getDataSource() === 'supabase' ? 'Production (Supabase)' : 'Demo (In-memory)'}`);
}); 