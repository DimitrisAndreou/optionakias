function parseDate(dateStr) {
  const rx = /^(\d+)([A-Z]+)(\d+)$/;
  const [unused, rawDay, rawMonth, rawYear] = dateStr.match(rx);
  return new Date(parseInt("20" + rawYear), parseMonth(rawMonth), parseInt(rawDay));
}

function parseMonth(monthStr) {
  switch (monthStr) {
    case 'JAN': return 0;
    case 'FEB': return 1;
    case 'MAR': return 2;
    case 'APR': return 3;
    case 'MAY': return 4;
    case 'JUN': return 5;
    case 'JUL': return 6;
    case 'AUG': return 7;
    case 'SEP': return 8;
    case 'OCT': return 9;
    case 'NOV': return 10;
    case 'DEC': return 11;
  }
  throw new Error("Unexpected month: [" + monthStr + "]");
}

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
    this.id = struct.symbol;
    this.symbol = symbol;
    this.rawDate = rawDate;
    this.strike = parseFloat(rawStrike);
    this.type = type === 'P' ? 'PUT' : 'CALL';
    this.expirationDate = parseDate(rawDate);
    this.DTE = Math.ceil((this.expirationDate - new Date()) / (1000 * 60 * 60 * 24));
    this.bidPrice = parseFloat(struct.bid1Price);
    this.bidSize = parseFloat(struct.bid1Size);
    this.markPrice = parseFloat(struct.markPrice);
    this.askPrice = parseFloat(struct.ask1Price);
    this.askSize = parseFloat(struct.ask1Size);
    this.underlyingPrice = parseFloat(struct.indexPrice);
    this.annualizedMaxGain = this.maxGain * 365 / this.DTE;
    this.maxGainAsChange = this.strike / this.underlyingPrice - 1;
    this.premiumAsKind = this.premium / this.underlyingPrice;
  }

  get isPut() { return this.type === 'PUT'; }
  get isCall() { return this.type === 'CALL'; }

  // TODO: the following properties should be based on Price and Ratio instead.
  get maxGain() { return this.premium; }
  // Hacky way to do the calculations in a "pessimistic" manner:
  // pessimistic because we're viewing it from the seller's point of view,
  // hence we use the bid.
  // The mark price can be very far away; pointless to don't use it.
  get premium() { return this.bidPrice; }
  //   // premiumAsKind. Where is breakEven?
  // calls:
  // breakEven = strike + premium
  // beyond strike:
  // 1 loses
  // premiumAsKind wins
  // 1 - (2 * premiumAsKind) 
  // x = strike / (1 - premiumAsKind)

  // This depends on a subclass defining "breakEven".
  get breakEvenAsChange() { return this.breakEven / this.underlyingPrice - 1.0; }

  priceToOpen(size) {
    return Price.fromMarket(size, this.bidPrice, this.markPrice, this.askPrice);
  }

  priceToClose(size, underlyingPrice) {
    // We close the opened position, hence -size.
    return Price.fromExercise(-size, this.moneyness(underlyingPrice));
  }
}

class PutOption extends Option {
  constructor(struct) {
    super(struct);
    this.breakEven = this.strike - this.premium;
    this.maxLoss = this.breakEven;
    this.maxGainRatio = this.maxGain / this.maxLoss;
    this.breakEvenVsHodler = this.underlyingPrice * (1 + this.maxGainRatio);
    this.gainAtCurrentPrice = Math.min(this.underlyingPrice - this.breakEven, this.maxGain);
    this.gainAtCurrentPriceRatio = this.gainAtCurrentPrice / this.maxLoss;
    this.annualizedMaxGainRatio = this.maxGainRatio * 365 / this.DTE;
  }

  moneyness(underlyingPrice) {
    return Math.max(0, this.strike - underlyingPrice);
  }
}

class CallOption extends Option {
  constructor(struct) {
    super(struct);
    this.breakEven = this.strike + this.premium;
    this.gainAtCurrentPrice = Math.min(this.breakEven - this.underlyingPrice, this.maxGain);
    this.breakEvenVsShorter = this.underlyingPrice - this.premium;
  }

  // This is the breakeven you get if you immediately swap the premium for units of the underlying asset.
  // Because when price = strike / (1 - premiumAsKind), the option has the negative value "strike-price",
  // but on the premium side, the position has the positive value "premiumAsKind * price"
  // Substitute the price and you get equivalence of the two.
  get breakEvenWithPremiumAsKind() {
    return this.strike / (1 - this.premiumAsKind);
  }

  get breakEvenAsChangeWithPremiumAsKind() {
    return this.breakEvenWithPremiumAsKind / this.underlyingPrice - 1.0;
  }

  moneyness(underlyingPrice) {
    return Math.max(0, underlyingPrice - this.strike);
  }
}

// A price which can either be derived from the "mark price" (mid point between bid and ask) or
// the pessimistic side (the bid if you are trying to sell, or the ask if you are trying to buy).
// The "pessimistic" price is what you could immediately get via a "Market order".
class Price {
  constructor(fair = 0.0, pessimistic = fair) {
    this.fair = fair;
    this.pessimistic = pessimistic;
    this.fairAsBet = fair + 1;
    this.pessimisticAsBet = pessimistic + 1;
  }

  copy() {
    return new Price(this.fair, this.pessimistic);
  }

  add(that) {
    this.fair += that.fair;
    this.pessimistic += that.pessimistic;
    return this;
  }

  static fromMarket(size, bidPrice, markPrice, askPrice) {
    if (size >= 0) {
      // Means we buy (we pay), hence the "-".
      return new Price(-size * markPrice, -size * Math.max(markPrice, askPrice));
    }
    // Means we sell (we get paid), hence size is negated (becomes positive).
    return new Price(-size * markPrice, -size * Math.min(bidPrice, markPrice));
  }

  static fromExercise(size, exercisedPrice) {
    return Price.fromMarket(size, exercisedPrice, exercisedPrice, exercisedPrice)
  }
}

// Refers to multiple option positions of the same underlying and same expiration.
class Strategy {
  constructor() {
    this.positions = new Map();
  }

  addLeg(option, size = 0) {
    if (this.symbol === undefined) {
      this.symbol = option.symbol;
      this.rawDate = option.rawDate;
      this.DTE = option.DTE;
      this.underlyingPrice = option.underlyingPrice;
    } else {
      if (this.symbol !== option.symbol || this.rawDate !== option.rawDate) {
        throw new Error(`Cannot mix different symbols or expirations: ${this.symbol}-${this.rawDate} vs ${option.symbol}-${option.rawDate}`);
      }
    }
    this.positions.set(option, (this.positions.get(option) || 0) + size);
    return this;
  }

  // How many contracts can be opened?
  maxSize() {
    let mostScarceOffer = Number.MAX_VALUE;
    this.positions.forEach((size, leg) => {
      if (size < 0) {
        mostScarceOffer = Math.min(mostScarceOffer, leg.bidSize);
      } else if (size > 0) {
        mostScarceOffer = Math.min(mostScarceOffer, leg.askSize);
      }
    });
    return mostScarceOffer;
  }

  // priceVisitor(size, leg, price)
  priceToOpen(sum = new Price(), priceVisitor = () => undefined) {
    this.positions.forEach((size, leg) => {
      const legPriceToOpen = leg.priceToOpen(size);
      priceVisitor(size, leg, legPriceToOpen);
      sum.add(leg.priceToOpen(size));
    });
    return sum;
  }

  // priceVisitor(size, leg, price)
  priceToClose(underlyingPrice, sum = new Price(), priceVisitor = () => undefined) {
    this.positions.forEach((size, leg) => {
      const legPriceToClose = leg.priceToClose(size, underlyingPrice);
      priceVisitor(size, leg, legPriceToClose);
      sum.add(legPriceToClose);
    });
    return sum;
  }
}

export class SpreadBet {
  constructor(strategy, bestStrike, worstStrike) {
    this.strategy = strategy;
    this.bestStrike = bestStrike;
    this.worstStrike = worstStrike;
    const isOver = bestStrike > worstStrike;

    let explanationHtml = `<ol>`;

    const legExplainer = (size, leg, price) => {
      explanationHtml += `<ul><li>`;
      explanationHtml += `<b>${size} of ${leg.id}</b>: value will be <b>$${price.pessimistic}</b>.`
      explanationHtml += `</li></ul>`;
    };

    const openPositionExplainer = (size, leg, price) => {
      if (size === 0) return;
      explanationHtml += `<li>`;
      explanationHtml += `You <b>${size > 0 ? "BUY" : "SELL"}</b> ${Math.abs(size)} of this option: <b>${leg.id}</b>.`;
      explanationHtml += `You should ${size > 0 ? "pay" : "receive"} about $${Math.abs(price.fair).toFixed(1)}, `;
      explanationHtml += `or at ${size > 0 ? "most" : "least"} $<b>${Math.abs(price.pessimistic).toFixed(1)}</b> via a market order.`;
      explanationHtml += `</li>`;
    };
    const priceToOpen = this.strategy.priceToOpen(new Price(), openPositionExplainer);
    const isDebit = priceToOpen.pessimistic < 0;
    explanationHtml += `</ol><p><hr>Thus to open the trade, you will <b>${isDebit ? "pay" : "receive"} `;
    explanationHtml += `$${Math.abs(priceToOpen.pessimistic).toFixed(1)}, net.</b></p>`;
    explanationHtml += `<hr><p>Then, at expiration (on ${strategy.rawDate}), there are two outcomes:</p><ul>`;
    explanationHtml += `<li>The <b>best outcome</b> is that ${strategy.symbol} will be at <b>$${bestStrike}</b> (or `;
    explanationHtml += `${bestStrike > worstStrike ? 'above' : 'below'}). Then this will be the value of your positions:`;
    const maxGain = this.strategy.priceToClose(bestStrike, new Price(), legExplainer);

    explanationHtml += `<p>That is, a total value of <b>$${maxGain.pessimistic.toFixed(1)}</b>. `;
    explanationHtml += `Together with the opening trade, the final P&L would be: `;
    const bestFinal = priceToOpen.copy().add(maxGain);
    explanationHtml += `$<b>${bestFinal.fair.toFixed(1)}</b> or at worst (with market orders) <b>$${bestFinal.pessimistic.toFixed(1)}</b></p></li>`;

    explanationHtml += `<li>The <b>worst outcome</b> is that ${strategy.symbol} will be at <b>$${worstStrike}</b> (or `;
    explanationHtml += `${worstStrike < bestStrike ? 'below' : 'above'}). Then this will be the value of your positions:`;
    const maxLoss = this.strategy.priceToClose(worstStrike, new Price(), legExplainer);
    explanationHtml += `<p>That is, a total value of <b>$${maxLoss.pessimistic.toFixed(1)}</b>. `;
    explanationHtml += `Together with the opening trade, the final P&L would be: `;
    const worstFinal = priceToOpen.copy().add(maxLoss);
    explanationHtml += `<b>$${worstFinal.fair.toFixed(1)}</b> or at worst (with market orders) <b>$${worstFinal.pessimistic.toFixed(1)}</b></p></li>`;
    explanationHtml += `</li></ul>`;

    this.earnedYield = new Price(
      -bestFinal.fair / worstFinal.fair,
      -bestFinal.pessimistic / worstFinal.pessimistic);

    explanationHtml = `<p>How to create this position: ` +
      `<b>${strategy.symbol}</b> (currently at <b>$${strategy.underlyingPrice}</b>) <b>${isOver ? "OVER" : "UNDER"} $${bestStrike} after ` +
      `${strategy.DTE} days</b> (${strategy.rawDate}), which should yield (if you win) a profit of at least ` +
      `<b>${(this.earnedYield.pessimistic * 100).toFixed(1)}%</b></p>` + explanationHtml;

    explanationHtml += `<p><b>Hence</b>, given that the MaxGain is $${bestFinal.fair.toFixed(1)} (or at worst $${bestFinal.pessimistic.toFixed(1)}), `;
    explanationHtml += `and the MaxLoss is $${worstFinal.fair.toFixed(1)} (or at worst $${worstFinal.pessimistic.toFixed(1)}), `;
    explanationHtml += `the yield of this bet (if you win it) is ${(this.earnedYield.fair * 100).toFixed(1)}% `;
    explanationHtml += `or at least <b>${(this.earnedYield.pessimistic * 100).toFixed(1)}%</b>, with market orders.`
    this.explanationHtml = explanationHtml;
  }

  // Over strategy: sell high (max gain price), buy low (max loss point).
  static createOver(option1, option2) {
    const [low, high] = SpreadBet.lowStrikeFirst(option1, option2);
    const size = Math.min(1, low.askSize, high.bidSize);
    return new SpreadBet(new Strategy().addLeg(high, -size).addLeg(low, size), high.strike, low.strike);
  }

  // Under strategy: sell low (max gain price), buy high (max loss point).
  static createUnder(option1, option2) {
    const [low, high] = SpreadBet.lowStrikeFirst(option1, option2);
    const size = Math.min(1, low.bidSize, high.askSize);
    return new SpreadBet(new Strategy().addLeg(low, -size).addLeg(high, size), low.strike, high.strike);
  }

  static lowStrikeFirst(option1, option2) {
    if (option1.type !== option2.type || option1.strike === option2.strike) {
      throw new Error('Can only build a spread from options of the same symbol, same type, different strike: ' +
        `${option1.id}, ${option2.id} `);
    }
    return option1.strike < option2.strike ? [option1, option2] : [option2, option1];
  }
}
