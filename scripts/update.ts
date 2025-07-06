import fs from 'fs';
import axios from 'axios';

// delete existing folders
fs.rmdirSync('src/lib/securities/index', { recursive: true });
fs.mkdirSync('src/lib/securities/index');

const rawCompanies = await axios.get('https://tsx.com/json/company-directory/search/tsx/*');

fs.writeFileSync('src/lib/securities/index.json', JSON.stringify(rawCompanies));

const companies = new Map(
	rawCompanies.results.flatMap((c: { instruments: { symbol: string; name: string }[] }) =>
		c.instruments.map((i) => [i.symbol, i.name])
	)
);

const combined: unknown[] = [];

for (const [stock, name] of companies.entries()) {
	if (fs.existsSync(`src/lib/securities/index/${stock}.json`)) {
		console.log('Skipping', name);
		continue;
	}

	console.log('Getting data for', name);
	const resp = await axios.post('https://app-money.tmx.com/graphql', {
		operationName: 'getQuoteBySymbol',
		variables: { symbol: stock, locale: 'en' },
		query:
			'query getQuoteBySymbol($symbol: String, $locale: String) {\n  getQuoteBySymbol(symbol: $symbol, locale: $locale) {\n    symbol\n    name\n    price\n    priceChange\n    percentChange\n    exchangeName\n    exShortName\n    exchangeCode\n    marketPlace\n    sector\n    industry\n    volume\n    openPrice\n    dayHigh\n    dayLow\n    MarketCap\n    MarketCapAllClasses\n    peRatio\n    prevClose\n    dividendFrequency\n    dividendYield\n    dividendAmount\n    dividendCurrency\n    beta\n    eps\n    exDividendDate\n    longDescription\n    fulldescription\n    website\n    email\n    phoneNumber\n    fullAddress\n    employees\n    shareOutStanding\n    totalDebtToEquity\n    totalSharesOutStanding\n    sharesESCROW\n    vwap\n    dividendPayDate\n    weeks52high\n    weeks52low\n    alpha\n    averageVolume10D\n    averageVolume20D\n    averageVolume30D\n    averageVolume50D\n    priceToBook\n    priceToCashFlow\n    returnOnEquity\n    returnOnAssets\n    day21MovingAvg\n    day50MovingAvg\n    day200MovingAvg\n    dividend3Years\n    dividend5Years\n    datatype\n    issueType\n    close\n    qmdescription\n    __typename\n  }\n}'
	});

	if (resp.data.data.getQuoteBySymbol === null) {
		console.error(`No data found for ${stock} (${name})`);
		continue;
	}

	fs.writeFileSync(
		`src/lib/securities/index/${stock}.json`,
		JSON.stringify(resp.data.data.getQuoteBySymbol, null, '\t')
	);

	combined.push(resp.data.data.getQuoteBySymbol);
}

fs.writeFileSync('src/lib/securities/aggregated.json', JSON.stringify(combined, null, '\t'));
