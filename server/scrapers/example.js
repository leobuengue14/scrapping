const puppeteer = require('puppeteer');

class ExampleScraper {
  async scrape(url) {
    let browser;
    try {
      // Launch browser
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
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to the page
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for the page to load
      await page.waitForTimeout(3000);

      // Extract product information
      const productData = await page.evaluate(() => {
        // Example selectors - modify these based on the actual website structure
        let productName = '';
        const nameSelectors = [
          'h1.product-title',
          '.product-name h1',
          'h1[data-testid="product-title"]',
          '.product-details h1',
          'h1'
        ];

        for (const selector of nameSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            productName = element.textContent.trim();
            break;
          }
        }

        // Try different selectors for price
        let price = '';
        const priceSelectors = [
          '.product-price .current-price',
          '.price-current',
          '[data-testid="product-price"]',
          '.product-price',
          '.price'
        ];

        for (const selector of priceSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            price = element.textContent.trim();
            break;
          }
        }

        // Clean up price (remove currency symbols and extra spaces)
        price = price.replace(/[^\d.,]/g, '').trim();

        return {
          name: productName,
          price: price,
          url: window.location.href
        };
      });

      // Validate that we got the required data
      if (!productData.name) {
        throw new Error('Could not extract product name');
      }

      if (!productData.price) {
        throw new Error('Could not extract product price');
      }

      return productData;

    } catch (error) {
      console.error('Error scraping example site:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Helper method to validate if a URL is from this source
  static isValidUrl(url) {
    return url.includes('example.com'); // Replace with actual domain
  }
}

module.exports = new ExampleScraper(); 