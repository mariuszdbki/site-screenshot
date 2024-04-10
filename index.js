const express = require('express');
const webdriver = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const app = express();
const httpPort = 3300;

const seleniumUrl = process.env.SELENIUM_URL; // e.g. http://selenium.grid:4444/wd/hub
const websiteUrl = process.env.WEBSITE_URL;

app.get('/:url?', async (req, res) => {
    
    let url = req.params.url || websiteUrl;
    if (!url) {
        res.status(404).send('No URL provided!'+ url);
        return;
    }

    let options = new firefox.Options();
    const driver = await new webdriver.Builder()
        .forBrowser(webdriver.Browser.FIREFOX)
        .usingServer(seleniumUrl)
        .setFirefoxOptions(options.addArguments('--headless'))
        .build();

    await driver.manage().setTimeouts({ implicit: 5000 }); // 5s
    
    await driver.get(url);
    let image = await driver.takeScreenshot(true); 
    await driver.quit();

    res.set('Content-Type', 'image/png');
    res.send(Buffer.from(image, 'base64'));
    
});

app.listen(httpPort, () => {
    console.log(`Listening on port ${httpPort}!`);
});
