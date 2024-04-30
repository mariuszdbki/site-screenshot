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
    try {
      driver = await new webdriver.Builder()
      .forBrowser(webdriver.Browser.FIREFOX)
      .usingServer(seleniumUrl)
      .setFirefoxOptions(firefoxOptions)
      .build();
    } catch (error) {
        console.error('Failed to initialize Selenium WebDriver:', error);
        process.exit(1);
    }
}

async function assureDriverActive() {
  if (!driver) {
    createDriver();
  }
  else {
    try {
      await driver.getCurrentUrl();
    } catch (err) {
      driver.quit();
      createDriver();
    }
  }
}

async function serveRequest(req, res) {
    try {

        assureDriverActive();

        if (!driver) {
            console.error('Selenium WebDriver not initialized!');
            res.status(500).send('Failed to take screenshot (webdriver not initialized)');
            return;
        }

        let url = req.params.url || req.body.url || websiteUrl;
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

createDriver();

app.use(express.json());

app.all('/:url?', serveRequest);

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
