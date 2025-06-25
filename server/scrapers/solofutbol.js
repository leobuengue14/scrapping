const puppeteer = require('puppeteer');

class SoloFutbolScraper {
  async scrape(url, attempt = 1) {
    let browser;
    try {
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

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
      // Esperar a que el body esté presente
      await page.waitForSelector('body', { timeout: 10000 });
      // Esperar a que el h1 esté presente (máx 15s)
      try {
        await page.waitForSelector('h1', { timeout: 15000 });
      } catch (e) {
        await page.screenshot({ path: 'debug-solofutbol-noh1.png' });
        throw new Error('No se encontró el h1 en la página de Solo Futbol. Screenshot guardado.');
      }
      // Espera adicional para JS dinámico
      await page.waitForTimeout(3000);
      // Screenshot para debug
      await page.screenshot({ path: 'debug-solofutbol-screenshot.png' });

      // Extraer información del producto
      const productData = await page.evaluate(() => {
        // Name
        let productName = '';
        const nameElement = document.querySelector('h1');
        if (nameElement) {
          productName = nameElement.textContent.trim();
        }

        // Price
        let price = '';
        const priceElement = document.querySelector('span.price');
        if (priceElement) {
          price = priceElement.textContent.trim();
        } else {
          // Try fallback: look for $ and numbers
          const priceMatch = document.body.innerText.match(/\$\s?([\d.,]+)/);
          if (priceMatch) {
            price = priceMatch[1];
          }
        }
        price = price.replace(/[^\d.,]/g, '').trim();

        // Image
        let image = '';
        // First try to get the og:image meta tag which contains the product image
        const ogImageMeta = document.querySelector('meta[property="og:image"]');
        if (ogImageMeta && ogImageMeta.content) {
          image = ogImageMeta.content;
        } else {
          // Fallback: try to find product image in gallery
          const imgElement = document.querySelector('.gallery .fotorama__active img, .product-main-image img, .product-image img, .main-product-photo img, .product-image-gallery img, .product-image img, .gallery img');
          if (imgElement) {
            image = imgElement.src;
          } else {
            // Last fallback: first image in the page (but exclude logos)
            const allImages = document.querySelectorAll('img');
            for (let img of allImages) {
              const src = img.src;
              // Skip logo images and small images
              if (src && 
                  !src.includes('logo') && 
                  !src.includes('favicon') && 
                  !src.includes('banner') &&
                  img.width > 100 && 
                  img.height > 100) {
                image = src;
                break;
              }
            }
          }
        }

        return {
          name: productName,
          price: price,
          url: window.location.href,
          image: image
        };
      });

      if (!productData.name) {
        throw new Error('No se pudo extraer el nombre del producto');
      }
      if (!productData.price) {
        throw new Error('No se pudo extraer el precio del producto');
      }

      return productData;
    } catch (error) {
      // Retry automático si ocurre Navigating frame was detached
      if (error.message && error.message.includes('Navigating frame was detached') && attempt < 2) {
        console.warn('Frame detached, esperando 2s y reintentando el scraping de Solo Futbol...');
        if (browser) await browser.close();
        await new Promise(res => setTimeout(res, 2000));
        return this.scrape(url, attempt + 1);
      }
      console.error('Error scraping Solo Futbol:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  static isValidUrl(url) {
    return url.includes('solofutbol.com');
  }
}

module.exports = new SoloFutbolScraper(); 