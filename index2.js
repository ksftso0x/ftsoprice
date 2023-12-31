const ccxt = require('ccxt');
const cctxws = require('ccxws');

// Platforms
const platforms = ['binance', 'binanceus', 'bittrex', 'coinbasepro', 'bitstamp', 'kraken'];

// Pairs
const pairs = ['SGB/USD', 'FLR/USD'];

// Function to fetch prices
const fetchPrices = async () => {
  try {
    // Initialize ccxt instances for each platform
    const exchanges = platforms.map((platform) => new ccxt[platform]());

    // Load markets for each exchange
    await Promise.all(exchanges.map((exchange) => exchange.loadMarkets()));

    // Fetch the ticker prices for each pair on each platform
    for (const pair of pairs) {
      console.log(`Fetching prices for ${pair}...`);

      for (const exchange of exchanges) {
        if (exchange.has['fetchTicker']) {
          try {
            const ticker = await exchange.fetchTicker(pair);
            console.log(`${exchange.name} - Price: ${ticker.last}`);
          } catch (error) {
            console.error(`Error fetching price from ${exchange.name}: ${error.message}`);
          }
        } else {
          console.log(`Fetching price from ${exchange.name} is not supported.`);
        }
      }

      console.log('');
    }

    // Close ccxt instances
    for (const exchange of exchanges) {
      exchange.close();
    }
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
  }
};

// Fetch prices
fetchPrices();