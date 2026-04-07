const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 317, height: 664 });
    const url = 'http://127.0.0.1:8080/'; 
    try {
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        // Find elements wider than viewport
        const wideElements = await page.evaluate(() => {
            const bodyWidth = document.body.clientWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            
            const results = {
                bodyWidth,
                scrollWidth,
                elements: []
            };

            const allElements = document.querySelectorAll('*');
            for(let el of allElements) {
                const rect = el.getBoundingClientRect();
                if (rect.right > 317 && rect.width > 0) {
                    let path = el.tagName.toLowerCase();
                    if(el.id) path += '#' + el.id;
                    if(el.className && typeof el.className === 'string') path += '.' + el.className.split(' ').join('.');
                    results.elements.push({
                        path: path,
                        width: rect.width,
                        right: rect.right,
                        text: el.innerText ? el.innerText.substring(0, 30) : ''
                    });
                }
            }
            return results;
        });
        
        console.log(JSON.stringify(wideElements, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
