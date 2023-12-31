let fs = require("fs");
let yargs = require("yargs");
let ccxt = require("ccxt");
let ccxws = require("ccxws");

let _name2client = {};
let _ex2priceInfo = {};

let isFirst = (type) => {
  return type == 'first';
};

let isAverage = (type) => {
  return type == 'avg';
}

let subscribeTo = async (ex, pair, marketObj) => {
  let client = _name2client[ex];
  client.on("error", (err) => {
    console.log(`Error for pair ${pair} on exchange ${ex}: ${err}`);
  });
  client.on("ticker", (a, b) => {
    _ex2priceInfo[ex] = {
      price: a.last, 
      priceTime: new Date().getTime()
    }
  });

  try {
    client.unsubscribeTicker(marketObj);
  } catch (e) {
    console.log(`Unsubscribe error: ${e}`);
  }
  client.subscribeTicker(marketObj);
};

let loadMarketsAndSubscribe = (ex, pair) => {
  let ccxtex = new (ccxt)[ex]({ timeout: 20 * 1000 });
  ccxtex.loadMarkets().then((data) => {
    let market = data[pair];
    if (market) {
      let marketObj = {
        id: market.id, 
        base: market.base, 
        quote: market.quote, 
        type: 'spot'
      };
      subscribeTo(ex, pair, marketObj);
    } else {
      console.log(`Bad market: ${pair}. Not supported by ${ex}.`);
      throw Error(`Bad market: ${pair}. Not supported by ${ex}.`);
    }
  });
};

let getPrice = async (exchanges, type) => {
  let prices = [];
  for (let ex of exchanges.map(x => x[0])) {
    let priceInfo = _ex2priceInfo[ex];
    if (priceInfo && priceInfo.price && priceInfo.priceTime + 10 * 1000 >= new Date().getTime()) {
      prices.push(Number(priceInfo.price));
      if (isFirst(type)) {
        break;
      }
    }
  }

  if (prices.length > 0) {
    return getAveragePrice(prices);
  } else {
    return getRestPrice();
  }
};

let getRestPrice = async (exchanges, type) => {
  let prices = [];
  for (let p of exchanges) {
    let ccxtex = new (ccxt)[p[0]]({ timeout: 20 * 1000 });
    let ticker = await ccxtex.fetchTicker(p[1]);
    if (ticker) {
      prices.push(Number(ticker.last));
      if (isFirst(type)) {
        break;
      }
    }
  }
  return getAveragePrice(prices);
}

let getAveragePrice = (prices, pair, factor) => {
  if (prices.length == 0) {
    throw Error(`No price was retrieved for ${pair}`);
  } else {
    return (prices.reduce((a, b) => a + b, 0.0) / prices.length) * factor;
  }
};

// Args parsing
let args = yargs.option('config', {
  alias: 'c',
  type: 'string',
  description: 'Path to config json file',
  default: './config.json',
  demand: true
}).argv;

let conf = JSON.parse(fs.readFileSync(args['config']).toString());
let data = conf.priceProviderList.map((ppc, index) => {
  let dpd = {
    index: index, 
    symbol: ppc.symbol, 
    decimals: ppc.decimals, 
    label: "(" + ppc.symbol + "/USD)", 
    exchanges: ppc.priceProviderParams[2], 
    price: 0
  };
  
  for (let p of dpd.exchanges) {
    let ex = p[0];
    let market = p[1];
    _name2client[ex] = new (ccxws[ex])();
    console.log(_name2client[ex]);
    // loadMarketsAndSubscribe(ex, market);
    // dpd.price = getPrice(dpd.exchanges, ppc.priceProviderParams[3]);
  }
  return dpd;
});
// console.log(data);