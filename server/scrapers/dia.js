const puppeteer = require('puppeteer');

class DiaScraper {
  constructor() {
    this.name = 'Dia';
  }

  async scrape(url) {
    let browser;
    try {
      console.log('Starting to scrape:', url);
      
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
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      console.log('Page loaded, waiting for content...');
      await page.waitForTimeout(5000);

      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-dia-screenshot.png' });
      console.log('Screenshot saved as debug-dia-screenshot.png');

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
      console.error('Error scraping Dia:', error);
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
      // Extract product name
      let name = '';
      
      // Try multiple selectors for product name based on Dia's structure
      const nameSelectors = [
        'h1',
        '.product-name',
        '.product-title',
        '[data-testid="product-name"]',
        '.product h1',
        'h1.product-name',
        '.product-info h1',
        '.product-details h1',
        '.product-header h1',
        '.product-name h1',
        '.product-title h1',
        '[class*="product-name"]',
        '[class*="product-title"]',
        '.product-name',
        '.product-title'
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
        if (pageTitle && pageTitle !== 'Dia') {
          name = pageTitle.replace(' - Dia', '').replace(' | Dia', '').trim();
          console.log('Extracted name from page title:', name);
        }
      }

      // Extract price - Dia uses format like "$ 3.400"
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
        '.product-price .price',
        '.price-container .price',
        '.price-wrapper .price',
        '[class*="price"]:not([class*="shipping"]):not([class*="envio"])',
        '[class*="Price"]:not([class*="shipping"]):not([class*="envio"])',
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
          // Format like "3.400" -> "3400" (Argentine format)
          cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '');
        } else if (cleanPrice.includes('.')) {
          // Format like "3,400" -> "3400" (US format)
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
          const priceMatch = text.match(/\$\s*[\d.,]+/);
          return priceMatch ? priceMatch[0] : '';
        });
        
        if (priceText) {
          // Remove all non-numeric characters except dots and commas
          let cleanPrice = priceText.replace(/[^\d,.]/g, '');
          
          // Handle different price formats
          if (cleanPrice.includes(',')) {
            // Format like "3.400" -> "3400" (Argentine format)
            cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '');
          } else if (cleanPrice.includes('.')) {
            // Format like "3,400" -> "3400" (US format)
            cleanPrice = cleanPrice.replace(/,/g, '');
          }
          
          // Save as string without currency symbol (don't use parseInt to avoid truncation)
          price = cleanPrice;
          console.log('Found price in page text:', price);
        }
      }

      // Extract product image
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
        '.product-main-image img',
        '.product-image',
        'img'
      ];

      for (const selector of imageSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const src = await page.evaluate(el => el.src, element);
            if (src && src.startsWith('http')) {
              image = src;
              console.log('Image found with selector', selector, ':', image);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // If no image found, try to find the largest image on the page
      if (!image) {
        const imgs = await page.$$eval('img', imgs => 
          imgs.map(img => ({
            src: img.src, 
            w: img.naturalWidth, 
            h: img.naturalHeight
          }))
        );
        
        const bigImg = imgs
          .filter(i => i.src.startsWith('http'))
          .sort((a, b) => (b.w * b.h) - (a.w * a.h))[0];
        
        if (bigImg) {
          image = bigImg.src;
          console.log('Large image found:', image);
        } else {
          console.log('No product image found');
        }
      }

      return {
        name: name,
        price: price,
        url: await page.url(),
        image: image
      };

    } catch (error) {
      console.error('Error extracting product data:', error);
      throw error;
    }
  }

  static isValidUrl(url) {
    return url.includes('diaonline.supermercadosdia.com.ar');
  }
}

module.exports = DiaScraper; 