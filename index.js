const express = require('express');
const webdriver = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const app = express();

const httpPort = 3300;

const seleniumUrl = process.env.SELENIUM_URL; // e.g. http://selenium.grid:4444/wd/hub
const websiteUrl = process.env.WEBSITE_URL;
const browserWindowWidth = process.env.BROWSER_WINDOW_WIDTH || 600;
const browserWindowHeight = process.env.BROWSER_WINDOW_HEIGHT || 800;

const firefoxOptions = new firefox.Options();
    firefoxOptions.addArguments('--headless');
    firefoxOptions.addArguments(`--width=${browserWindowWidth}`);
    firefoxOptions.addArguments(`--height=${browserWindowHeight}`);

let driver;

async function createDriver() {
    driver = await new webdriver.Builder()
    .forBrowser(webdriver.Browser.FIREFOX)
    .usingServer(seleniumUrl)
    .setFirefoxOptions(firefoxOptions)
    .build();
}

async function serveRequest(req, res) {
    try {
        if (!driver) {
            console.error('Selenium WebDriver not initialized!');
            res.status(500).send('Failed to take screenshot (webdriver not initialized)');
            return;
        }

        let url = req.body?.url || websiteUrl;
        if (!url) {
            res.status(404).send('No proper URL provided!');
            return;
        }

        await driver.get(url);
        let image = await driver.takeScreenshot(true);

        res.set('Content-Type', 'image/png');
        res.send(Buffer.from(image, 'base64'));
    } catch (error) {
        console.error('Failed to take screenshot:', error);
        res.status(500).send('Failed to take screenshot');
    }   
}

createDriver().catch(error => {
    console.error('Failed to initialize Selenium WebDriver:', error);
    process.exit(1); 
});

app.use(express.json());

app.all('/', serveRequest);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status).send(err.message);
  })

app.listen(httpPort, () => {
    console.log(`Listening on port ${httpPort}!`);
});

process.on('SIGINT', async () => {
    console.log('Shutting down...');
    if (driver) {
        await driver.quit();
    }
    process.exit(0);
});
