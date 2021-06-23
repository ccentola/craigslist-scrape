const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Listing = require('./model/Listing');

async function scrapeListings(page)
{

    await page.goto('https://sfbay.craigslist.org/d/software-qa-dba-etc/search/sof');
    const html = await page.content();

    // load html data
    const $ = cheerio.load(html);

    // capture job title and url
    const listings = $('.result-info').map((index, element) =>
    {
        const titleElement = $(element).find('.result-title');
        const timeElement = $(element).find('.result-date');
        const hoodElement = $(element).find('.result-hood');
        const title = $(titleElement).text();
        const url = $(titleElement).attr('href');
        const datePosted = new Date($(timeElement).attr('datetime'));
        const neighborhood = $(hoodElement).text().trim().replace('(', '').replace(')', '');
        return { title, url, datePosted, neighborhood };
    }).get();

    return (listings);
}

async function connectToMongoDB()
{
    const uri = "mongodb+srv://admin_user:SuperSafePassword@cluster0.kjhqe.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
    await mongoose.connect(uri, { useUnifiedTopology: true });
    console.log('connected');
}

async function scrapeJobDescriptions(listings, page)
{
    for (let i = 0; i < listings.length; i++)
    {
        await page.goto(listings[i].url);
        const html = await page.content();
        const $ = cheerio.load(html);

        const jobDescription = $('#postingbody').text();
        listings[i].jobDescription = jobDescription;

        const compensation = $('p.attrgroup > span:nth-child(1) > b').text();
        listings[i].compensation = compensation;

        const listingModel = new Listing(listings[i]);
        await listingModel.save();

        await sleep(1000);
    }

}

async function sleep(ms)
{
    // generic sleep function
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main()
{

    await connectToMongoDB();

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const listings = await scrapeListings(page);
    const listingsWithJobDescriptions = await scrapeJobDescriptions(listings, page);

    console.log(listings);

}

main();


