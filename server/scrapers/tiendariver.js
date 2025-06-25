const puppeteer = require('puppeteer');

class TiendaRiverScraper {
  constructor() {
    this.name = 'TiendaRiver';
  }

  async scrape(url) {
    let browser;
    try {
      console.log('Starting to scrape:', url);
      
      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log('Browser launched successfully');

      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      console.log('Navigating to page...');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      console.log('Page loaded, waiting for content...');
      await page.waitForTimeout(3000);

      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-tiendariver-screenshot.png' });
      console.log('Screenshot saved as debug-tiendariver-screenshot.png');

      // Get page title for debugging
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);

      // Extract product data
      const productData = await this.extractProductData(page);
      console.log('Data extraction completed:', productData);

      // Validate extracted data
      if (!productData.name || productData.name.trim() === '') {
        throw new Error('Could not extract product name');
      }

      if (!productData.price || productData.price.trim() === '') {
        throw new Error('Could not extract product price');
      }

      console.log('Successfully scraped data:', productData);
      return productData;

    } catch (error) {
      console.error('Error scraping Tienda River:', error);
      throw error;
    } finally {
      if (browser) {
        console.log('Closing browser...');
        await browser.close();
      }
    }
  }

  async extractProductData(page) {
    try {
      // Extract product name - based on the provided example
      // The name appears to be in an H1 tag or similar heading
      let name = '';
      
      // Try multiple selectors for product name
      const nameSelectors = [
        'h1',
        '.product-name',
        '.product-title',
        '[data-testid="product-name"]',
        '.product h1',
        'h1.product-name',
        '.product-info h1',
        'h1:contains("Campera")',
        'h1:contains("River")'
      ];

      for (const selector of nameSelectors) {
        try {
          const nameElement = await page.$(selector);
          if (nameElement) {
            name = await page.evaluate(el => el.textContent.trim(), nameElement);
            if (name && name.length > 0) {
              console.log(`Found name with selector "${selector}":`, name);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // If no name found with selectors, try to extract from page title or URL
      if (!name || name.trim() === '') {
        const pageTitle = await page.title();
        if (pageTitle && pageTitle.includes('River')) {
          name = pageTitle.replace(' - Tienda River', '').trim();
          console.log('Extracted name from page title:', name);
        }
      }

      // Extract price - based on the provided example ($ 169.999,00)
      let price = '';
      
      // Try multiple selectors for price
      const priceSelectors = [
        '.price',
        '.product-price',
        '.price-current',
        '[data-testid="price"]',
        '.product .price',
        '.price-value',
        '.current-price',
        'span:contains("$")',
        '.price:contains("$")'
      ];

      for (const selector of priceSelectors) {
        try {
          const priceElement = await page.$(selector);
          if (priceElement) {
            price = await page.evaluate(el => el.textContent.trim(), priceElement);
            if (price && price.includes('$')) {
              console.log(`Found price with selector "${selector}":`, price);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Clean up price - remove currency symbol and extra spaces
      if (price) {
        // Remove all non-numeric characters except dots and commas
        let cleanPrice = price.replace(/[^\d,.]/g, '');
        
        // Handle different price formats
        if (cleanPrice.includes(',')) {
          // Format like "149.999" -> "149999" (Argentine format)
          cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '');
        } else if (cleanPrice.includes('.')) {
          // Format like "149,999" -> "149999" (US format)
          cleanPrice = cleanPrice.replace(/,/g, '');
        }
        
        // Save as string without currency symbol (don't use parseInt to avoid truncation)
        price = cleanPrice;
        console.log('Cleaned price (numeric):', price);
      }

      // If no price found with selectors, try to find any text with currency symbol
      if (!price || price.trim() === '') {
        const priceText = await page.evaluate(() => {
          const text = document.body.innerText;
          // Find ALL price-like matches, but only use the first one
          const priceMatches = text.match(/\$\s*[\d.,]+/g);
          return priceMatches && priceMatches.length > 0 ? priceMatches[0] : '';
        });
        
        if (priceText) {
          // Remove all non-numeric characters except dots and commas
          let cleanPrice = priceText.replace(/[^\d,.]/g, '');
          
          // Handle different price formats
          if (cleanPrice.includes(',')) {
            // Format like "149.999" -> "149999" (Argentine format)
            cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '');
          } else if (cleanPrice.includes('.')) {
            // Format like "149,999" -> "149999" (US format)
            cleanPrice = cleanPrice.replace(/,/g, '');
          }
          
          // Save as string without currency symbol (don't use parseInt to avoid truncation)
          price = cleanPrice;
          console.log('Found price in page text:', price);
        }
      }

      // Extraer imagen principal del producto
      async function extractImage(page) {
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
          'img',
        ];
        for (const selector of imageSelectors) {
          const element = await page.$(selector);
          if (element) {
            const src = await page.evaluate(el => el.src, element);
            if (src && src.startsWith('http')) {
              image = src;
              console.log('Imagen encontrada con selector', selector, ':', image);
              break;
            }
          }
        }
        if (!image) {
          // Busca la imagen más grande
          const imgs = await page.$$eval('img', imgs => imgs.map(img => ({src: img.src, w: img.naturalWidth, h: img.naturalHeight})));
          const bigImg = imgs.filter(i => i.src.startsWith('http')).sort((a, b) => (b.w * b.h) - (a.w * a.h))[0];
          if (bigImg) {
            image = bigImg.src;
            console.log('Imagen grande encontrada:', image);
          } else {
            console.log('No se encontró imagen principal');
          }
        }
        return image;
      }
      const image = await extractImage(page);

      return {
        name: name || '',
        price: price || '',
        url: page.url(),
        image: image || ''
      };

    } catch (error) {
      console.error('Error extracting product data:', error);
      return {
        name: '',
        price: '',
        url: page.url(),
        image: ''
      };
    }
  }
}

module.exports = new TiendaRiverScraper(); 