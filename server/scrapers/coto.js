const puppeteer = require('puppeteer');

/**
 * CotoScraper
 *
 * Este scraper utiliza Puppeteer para extraer información de productos de Coto Digital.
 *
 * ⚠️ IMPORTANTE:
 * Para extraer el nombre del producto, se utiliza el selector `.title.text-dark` y se espera explícitamente
 * a que este elemento esté presente en el DOM con `await page.waitForSelector('.title.text-dark', {timeout: 5000})`.
 * Esto es necesario porque el contenido del nombre puede cargarse de forma dinámica y, si no se espera,
 * el scraper puede fallar al intentar extraer el nombre.
 *
 * Si Coto cambia la estructura de su página, solo será necesario actualizar el selector principal.
 *
 * Última actualización: 2024-06-13
 */
class CotoScraper {
    constructor() {
        this.name = 'Coto';
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
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // Navigate to the page
            console.log('Navigating to page...');
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Wait for content to load
            console.log('Page loaded, waiting for content...');
            await page.waitForTimeout(3000);
            
            // Take screenshot for debugging
            await page.screenshot({ path: 'debug-coto-screenshot.png' });
            console.log('Screenshot saved as debug-coto-screenshot.png');
            
            // Get page title for debugging
            const pageTitle = await page.title();
            console.log('Page title:', pageTitle);

            // Esperar a que el selector principal esté presente (por si el contenido es dinámico)
            try {
                await page.waitForSelector('.title.text-dark', {timeout: 5000});
                console.log('Esperando a que .title.text-dark esté presente...');
            } catch (e) {
                console.log('No se encontró .title.text-dark tras esperar 5s');
            }

            // Extract product data
            const data = await this.extractData(page);
            console.log('Data extraction completed:', data);
            
            // Validate required fields
            if (!data.name) {
                throw new Error('Could not extract product name');
            }
            if (!data.price) {
                throw new Error('Could not extract product price');
            }

            console.log('Successfully scraped data:', data);
            return data;

        } catch (error) {
            console.error('Error scraping Coto:', error);
            throw error;
        } finally {
            if (browser) {
                console.log('Closing browser...');
                await browser.close();
            }
        }
    }

    async extractData(page) {
        try {
            // Extract product name
            let name = '';
            const nameSelectors = [
                '.title.text-dark', // Selector específico para Coto
                'h1[data-testid="product-name"]',
                'h1.product-name',
                'h1',
                '[data-testid="product-title"]',
                '.product-title',
                '.product-name',
                '.product-details h1',
                '.product-info h1',
                '[class*="product-name"]',
                '[class*="product-title"]',
                '.product-details .title',
                '.product-info .title',
                '.product-header h1',
                '.product-header .title',
                '.product-main h1',
                '.product-main .title'
            ];

            console.log('Trying to extract product name from Coto...');
            
            for (const selector of nameSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        name = await page.evaluate(el => el.textContent.trim(), element);
                        console.log(`Found name with selector "${selector}": ${name}`);
                        if (name && name.length > 0) {
                            break;
                        }
                    }
                } catch (error) {
                    console.log(`Selector "${selector}" failed:`, error.message);
                }
            }

            // If still no name, try to get it from page title
            if (!name || name.length === 0) {
                try {
                    const pageTitle = await page.title();
                    console.log('Page title:', pageTitle);
                    
                    // Try to extract product name from page title
                    if (pageTitle && pageTitle.includes(' - ')) {
                        name = pageTitle.split(' - ')[0].trim();
                        console.log('Extracted name from page title:', name);
                    }
                } catch (error) {
                    console.log('Failed to get page title:', error.message);
                }
            }

            // If still no name, try to find any text that looks like a product name
            if (!name || name.length === 0) {
                try {
                    const allText = await page.evaluate(() => {
                        const elements = document.querySelectorAll('h1, h2, .title, .product-name, .product-title');
                        const texts = [];
                        elements.forEach(el => {
                            const text = el.textContent.trim();
                            if (text && text.length > 5 && text.length < 100) {
                                texts.push(text);
                            }
                        });
                        return texts;
                    });
                    
                    console.log('All potential product names found:', allText);
                    
                    if (allText.length > 0) {
                        name = allText[0];
                        console.log('Using first potential product name:', name);
                    }
                } catch (error) {
                    console.log('Failed to find alternative product names:', error.message);
                }
            }

            // Extract price
            let price = '';
            const priceSelectors = [
                '[data-testid="product-price"]',
                '.product-price',
                '.price',
                '[class*="price"]:not([class*="shipping"]):not([class*="envio"])',
                '.product-price-value',
                '.price-value',
                '[class*="price-value"]',
                '.product-details .price',
                '.product-info .price'
            ];

            for (const selector of priceSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        price = await page.evaluate(el => el.textContent.trim(), element);
                        console.log(`Found price with selector "${selector}":`, price);
                        if (price) break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }

            // If no price found with selectors, try to find it in the page text
            if (!price) {
                try {
                    const pageText = await page.evaluate(() => document.body.textContent);
                    const priceMatch = pageText.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
                    if (priceMatch) {
                        price = priceMatch[1];
                        console.log('Found price in page text:', price);
                    }
                } catch (e) {
                    console.log('Error extracting price from page text:', e.message);
                }
            }

            // Clean price - remove currency symbols and format
            if (price) {
                // Remove all non-numeric characters except dots and commas
                let cleanPrice = price.replace(/[^\d.,]/g, '');
                let numericPrice = null;
                // Si el precio tiene coma, es formato argentino: 4.865,00
                if (cleanPrice.includes(',')) {
                    // Reemplazar puntos (miles) por nada y la coma (decimales) por punto
                    // "4.865,00" -> "4865.00"
                    cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
                    numericPrice = parseFloat(cleanPrice);
                } else if (cleanPrice.includes('.')) {
                    // Si solo tiene punto, puede ser decimal US
                    numericPrice = parseFloat(cleanPrice.replace(/,/g, ''));
                } else {
                    // Solo números, sin decimales
                    numericPrice = parseInt(cleanPrice);
                }
                if (!isNaN(numericPrice)) {
                    price = numericPrice;
                } else {
                    price = cleanPrice;
                }
                console.log('Formatted price:', price);
            }

            // Extract image - prioritize product images over logos
            let image = '';
            const imageSelectors = [
                '.swiper-slide-active img',
                '.product-image img',
                '.product-gallery img',
                '[data-testid="product-image"] img',
                '.product-details img',
                '.product-info img',
                'img[alt*="producto"]',
                'img[alt*="Producto"]',
                'img[src*="product"]',
                'img[src*="Product"]',
                '[class*="product-image"] img'
            ];

            for (const selector of imageSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        const src = await page.evaluate(el => el.src, element);
                        const alt = await page.evaluate(el => el.alt || '', element);
                        
                        // Skip logo images and small images
                        if (src && 
                            !src.includes('data:image') && 
                            !src.includes('logo') && 
                            !src.includes('Logo') &&
                            !alt.toLowerCase().includes('logo') &&
                            !src.includes('LogoCOTO') &&
                            src.includes('cotodigital')) {
                            
                            image = src;
                            console.log(`Product image found with selector ${selector}:`, image);
                            break;
                        }
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }

            // Fallback: get the largest product image on the page (excluding logos)
            if (!image) {
                try {
                    const images = await page.$$('img');
                    let largestImage = '';
                    let maxSize = 0;

                    for (const img of images) {
                        const src = await page.evaluate(el => el.src, img);
                        const alt = await page.evaluate(el => el.alt || '', img);
                        const width = await page.evaluate(el => el.naturalWidth, img);
                        const height = await page.evaluate(el => el.naturalHeight, img);
                        
                        // Skip logos and small images
                        if (src && 
                            !src.includes('data:image') && 
                            !src.includes('logo') && 
                            !src.includes('Logo') &&
                            !alt.toLowerCase().includes('logo') &&
                            !src.includes('LogoCOTO') &&
                            src.includes('cotodigital') &&
                            width > 200 && height > 200) {
                            
                            const size = width * height;
                            if (size > maxSize) {
                                maxSize = size;
                                largestImage = src;
                            }
                        }
                    }
                    
                    if (largestImage) {
                        image = largestImage;
                        console.log('Fallback: Found largest product image:', image);
                    }
                } catch (e) {
                    console.log('Error in fallback image extraction:', e.message);
                }
            }

            return {
                name: name,
                price: price,
                url: page.url(),
                image: image
            };

        } catch (error) {
            console.error('Error in data extraction:', error);
            throw error;
        }
    }
}

module.exports = CotoScraper; 