export function makeOption(struct) {
  const [, , , type] = struct.symbol.split("-");
  if (type === 'P') {
    return new PutOption(struct);
  } else if (type === 'C') {
    return new CallOption(struct);
  }
  throw new Error(`Unexpected option type ${type}, from struct: ${struct.symbol}`);
}

export class Option {
  // Struct:
  // ask1Iv: "0",
  // ask1Price: "0"
  // ask1Size: "0"
  // bid1Iv: "0"
  // bid1Price: "5"
  // bid1Size: "0.01"
  // change24h: "0"
  // delta: "0.99238854"
  // gamma: "0.00000499"
  // highPrice24h: "0"
  // indexPrice: "30356.72"
  // lastPrice: "0"
  // lowPrice24h: "0"
  // markIv: "0.6093"
  // markPrice: "8486.42120764"
  // openInterest: "0"
  // predictedDeliveryPrice: "0"
  // symbol: "BTC-28JUL23-22000-C"
  // theta: "-2.35199556"
  // totalTurnover: "0"
  // totalVolume: "0"
  // turnover24h: "0"
  // underlyingPrice: "30475.4"
  // vega: "1.45050054"
  // volume24h: "0"
  constructor(struct) {
    const [symbol, rawDate, rawStrike, type] = struct.symbol.split("-");
    this._symbol = symbol;
    this._expirationDate = parseDate(rawDate);
    this._DTE = Math.ceil((this._expirationDate - new Date()) / (1000 * 60 * 60 * 24));
    this._strike = parseFloat(rawStrike);
    this._type = type;
    this._bidPrice = parseFloat(struct.bid1Price);
    this._bidSize = parseFloat(struct.bid1Size);
    this._markPrice = parseFloat(struct.markPrice);
    this._askPrice = parseFloat(struct.ask1Price);
    this._askSize = parseFloat(struct.ask1Size);
    this._underlyingPrice = parseFloat(struct.indexPrice);
    this._annualizedMaxGain = this._markPrice * 365 / this._DTE;
    this._maxGainAsChange = this._strike / this._underlyingPrice - 1;
    this._premiumAsPercent = this._markPrice / this._underlyingPrice;

  }

  get symbol() { return this._symbol; }
  get expirationDate() { return this._expirationDate; }
  get DTE() { return this._DTE; }
  get strike() { return this._strike; }
  get isPut() { return this._type === 'P'; }
  get isCall() { return this._type === 'C'; }

  get bidPrice() { return this._bidPrice; }
  get bidSize() { return this._bidSize; }
  get markPrice() { return this._markPrice; }
  get askPrice() { return this._askPrice; }
  get askSize() { return this._askPrice; }

  get maxGain() { return this._markPrice; }
  get premium() { return this._markPrice; }
  get premiumAsPercent() { return this._premiumAsPercent; }
  get maxGainInKind() { return this.premiumAsPercent; }
  get annualizedMaxGain() { return this._annualizedMaxGain; }
  get underlyingPrice() { return this._underlyingPrice; }
  get maxGainAsChange() { return this._maxGainAsChange; }

  // Note that 'breakEven' is defined in subclasses.
  get breakEvenAsChange() { return this.breakEven / this.underlyingPrice; }
}

export class PutOption extends Option {
  constructor(struct) {
    super(struct);
    this._breakEven = super.strike - super.premium;
    this._maxLoss = this._breakEven;
    this._maxGainRatio = this._maxGain / this._maxLoss;
    this._breakEvenVsHodler = super.underlyingPrice * (1 + this._maxGainRatio);
    this._gainAtCurrentPrice = Math.min(super.underlyingPrice - this._breakEven, this._maxGain);
    this._gainAtCurrentPriceRatio = this._gainAtCurrentPrice / this._maxLoss;
    this._annualizedMaxGainInKind = this._maxGainInKind * 365 / this._DTE;
    this._annualizedMaxGainRatio = this._maxGainRatio * 365 / this._DTE;
  }
  get breakEven() { return this._breakEven; }
  get maxLoss() { return this._maxLoss; }
  get maxGainRatio() { return this._maxGainRatio; }
  get breakEvenVsHodler() { return this._breakEvenVsHodler; }
  get gainAtCurrentPrice() { return this._gainAtCurrentPrice; }
  get gainAtCurrentPriceRatio() { return this._gainAtCurrentPriceRatio; }
  get annualizedMaxGainInKind() { return this._annualizedMaxGainInKind; }
  get annualizedMaxGainRatio() { return this._annualizedMaxGainRatio; }
}

export class CallOption extends Option {
  constructor(struct) {
    super(struct);
    this._breakEven = super.strike + super.premium;
    this._gainAtCurrentPrice = Math.min(this._breakEven - super._underlyingPrice, super.maxGain);
    this._breakEvenVsShorter = super.underlyingPrice - super.premium;
  }
  get breakEven() { return this._breakEven; }
  get gainAtCurrentPrice() { return this._gainAtCurrentPrice; }
  get breakEvenVsShorter() { return this._breakEvenVsShorter; }
}