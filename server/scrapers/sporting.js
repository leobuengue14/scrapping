const puppeteer = require('puppeteer');

class SportingScraper {
  async scrape(url) {
    let browser;
    try {
      console.log(`Starting to scrape: ${url}`);
      
      // Launch browser with better macOS compatibility
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        executablePath: process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined
      });

      console.log('Browser launched successfully');

      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      console.log('Navigating to page...');

      // Navigate to the page
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      console.log('Page loaded, waiting for content...');

      // Wait for the page to load and try to wait for dynamic content
      await page.waitForTimeout(5000);

      // Try to wait for common elements that might indicate the page is fully loaded
      try {
        await page.waitForSelector('h1, .product-name, .product-title', { timeout: 10000 });
      } catch (e) {
        console.log('No specific selectors found, continuing anyway...');
      }

      // Take a screenshot for debugging
      await page.screenshot({ path: 'debug-screenshot.png' });
      console.log('Screenshot saved as debug-screenshot.png');

      // Get page title for debugging
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);

      // Extract product information
      const productData = await page.evaluate(() => {
        console.log('Extracting data from page...');
        
        // Try different selectors for product name
        let productName = '';
        const nameSelectors = [
          'h1.product-name',
          '.product-title h1',
          'h1[data-testid="product-title"]',
          '.product-details h1',
          '.product-info h1',
          '.product-header h1',
          '.product h1',
          'h1.product-title',
          'h1',
          '.product-name',
          '.product-title',
          '[data-testid="product-name"]',
          '.product-details .product-name',
          '.product-header .product-name',
          '.product-info .product-name'
        ];

        for (const selector of nameSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            productName = element.textContent.trim();
            console.log(`Found product name with selector: ${selector} - "${productName}"`);
            break;
          }
        }

        // Try different selectors for price - focusing on the main product price
        let price = '';
        const priceSelectors = [
          // Main product price selectors for Sporting.com.ar
          '.product-price .price',
          '.price-current',
          '[data-testid="product-price"]',
          '.product-price',
          '.price',
          '.product-price-current',
          '.current-price',
          '.product-price .current-price',
          '.price-value',
          '[data-testid="price"]',
          '.product-details .price',
          '.product-info .price',
          '.product-header .price',
          '.price-container .price',
          '.product-price-container .price',
          '.price-wrapper .price',
          '.product-price-wrapper .price',
          // More specific selectors for Sporting.com.ar
          '.product-price-main',
          '.main-price',
          '.product-main-price',
          '.price-main',
          // Look for price elements that contain currency symbol
          '[class*="price"]:not([class*="shipping"]):not([class*="envio"])',
          '[class*="Price"]:not([class*="shipping"]):not([class*="envio"])',
          // Additional selectors for Sporting
          '.product-price .price-current',
          '.price-current .price',
          '.product-price-current .price',
          '.current-price .price'
        ];

        for (const selector of priceSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            const text = element.textContent.trim();
            // Check if this looks like a price (contains $ and numbers)
            if (text.includes('$') && /\d/.test(text)) {
              price = text;
              console.log(`Found price with selector: ${selector} - "${price}"`);
              break;
            }
          }
        }

        // If we still don't have a price, try to find the first price-like text on the page (avoid concatenated prices)
        if (!price) {
          const priceMatches = Array.from(document.body.innerText.matchAll(/\$\s*[\d.,]+/g));
          if (priceMatches && priceMatches.length > 0) {
            price = priceMatches[0][0]; // Solo el primer match
            console.log(`Found price in page text: "${price}"`);
          }
        }

        // Clean up price (extract just the numbers)
        if (price) {
          // Remove all non-numeric characters except dots and commas
          let cleanPrice = price.replace(/[^\d,.]/g, '');
          // Handle different price formats
          if (cleanPrice.includes(',')) {
            // Formato argentino: "179.999" -> "179999"
            cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '');
          } else if (cleanPrice.includes('.')) {
            // Formato US: "179,999" -> "179999"
            cleanPrice = cleanPrice.replace(/,/g, '');
          }
          // Guardar como string numérico completo (sin parseInt)
          price = cleanPrice;
          console.log('Cleaned price (numeric):', price);
        }

        console.log(`Extracted - Name: ${productName}, Price: ${price}`);

        // If we still don't have a name, try to get it from the page title
        if (!productName) {
          const title = document.title;
          if (title && title !== 'Sporting.com.ar') {
            productName = title.replace(' - Sporting.com.ar', '').replace(' | Sporting.com.ar', '');
            console.log(`Using page title as product name: ${productName}`);
          }
        }

        return {
          name: productName,
          price: price,
          url: window.location.href
        };
      });

      // Extract image separately using Puppeteer methods
      let image = '';
      const imageSelectors = [
        'img.product-main-image',
        '.product-gallery img',
        'img[data-testid="product-image"]',
        '.product-image img',
        '.product-images img',
        'img[src*="/products/"]',
        'img[alt*="producto"]',
        '.swiper-slide-active img',
        '.slick-active img',
        'img'
      ];

      for (const selector of imageSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const src = await page.evaluate(el => el.src, element);
            if (src && src.startsWith('http')) {
              image = src;
              console.log('Imagen encontrada con selector', selector, ':', image);
              break;
            }
          }
        } catch (error) {
          console.log(`Error with selector ${selector}:`, error.message);
        }
      }

      if (!image) {
        // Busca la imagen más grande
        try {
          const imgs = await page.$$eval('img', imgs => 
            imgs.map(img => ({
              src: img.src, 
              w: img.naturalWidth || img.width, 
              h: img.naturalHeight || img.height
            }))
          );
          const bigImg = imgs
            .filter(i => i.src && i.src.startsWith('http') && i.w > 100 && i.h > 100)
            .sort((a, b) => (b.w * b.h) - (a.w * a.h))[0];
          if (bigImg) {
            image = bigImg.src;
            console.log('Imagen grande encontrada:', image);
          } else {
            console.log('No se encontró imagen principal');
          }
        } catch (error) {
          console.log('Error buscando imagen grande:', error.message);
        }
      }

      // Add image to product data
      productData.image = image;

      console.log('Data extraction completed:', productData);

      // Validate that we got the required data
      if (!productData.name) {
        throw new Error('Could not extract product name');
      }

      if (!productData.price) {
        // For now, let's be more lenient with price and use a placeholder
        console.log('Could not extract price, using placeholder');
        productData.price = '0';
      }

      return productData;

    } catch (error) {
      console.error('Error scraping Sporting.com:', error);
      throw error;
    } finally {
      if (browser) {
        console.log('Closing browser...');
        await browser.close();
      }
    }
  }

  // Helper method to validate if a URL is from Sporting.com
  static isValidUrl(url) {
    return url.includes('sporting.com.ar');
  }
}

module.exports = new SportingScraper(); 