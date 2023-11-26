(()=>{"use strict";class e{constructor(e){this._columns=[],this._options={frozenRows:1,frozenColumns:0,showRowNumber:!1,columnWidth:200,allowHtml:!0,...e}}defineColumn(e,t,i,...r){return this._columns.push({header:e,valueFn:t,type:i,columnFormatters:r}),this}format(e,t){const i=new google.visualization.DataTable;this._columns.forEach((e=>i.addColumn(e.type,e.header))),i.addRows(e.map((e=>this._columns.map((t=>t.valueFn(e))))));const r=new google.visualization.Table(document.getElementById(t));return this._columns.forEach(((e,t)=>e.columnFormatters.forEach((e=>e.format(i,t))))),i.setProperty(0,0,"style","width:100px"),r.draw(i,this._options),{data:i,table:r}}}google.charts.load("current",{packages:["table"]});const t=()=>new google.visualization.NumberFormat({pattern:"$#,##0"}),i=()=>new google.visualization.NumberFormat({pattern:"฿#,##0.000"}),r=()=>new google.visualization.NumberFormat({pattern:"Ξ#,##0.00"}),n=()=>new google.visualization.NumberFormat({pattern:"#,###%"}),s=()=>new google.visualization.NumberFormat({pattern:"#.00"}),a=()=>new google.visualization.DateFormat({pattern:"dd MMM yyyy"}),o=()=>{const e=new google.visualization.ColorFormat;return e.addGradientRange(1,2,"#000000","#aff7b6","#93ecf8"),e.addGradientRange(2,4,"#000000","#93ecf8","#ffff50"),e.addGradientRange(4,8,"#000000","#ffff50","#fccf4b"),e.addGradientRange(8,16,"#000000","#fccf4b","#ffaaff"),e.addGradientRange(16,32,"#000000","#ffaaff","#ddaaff"),e.addGradientRange(32,null,"#000000","#ddaaff","#f2725d"),e},l=()=>{const e=new google.visualization.ColorFormat;return e.addGradientRange(0,1,"#000000","#FFFFFF","#00FF00"),e.addGradientRange(1,null,"#000000","#00FF00","#00FF00"),e},u=()=>{const e=new google.visualization.ColorFormat;return e.addGradientRange(null,-1,"#000000","#00FF00","#00FF00"),e.addGradientRange(-1,0,"#000000","#00FF00","#FFFFFF"),e.addGradientRange(0,1,"#000000","#FFFFFF","#FF0000"),e.addGradientRange(1,null,"#000000","#FF0000","#FF0000"),e},c=()=>{const e=new google.visualization.ColorFormat;return e.addGradientRange(null,-1,"#000000","#FF0000","#FF0000"),e.addGradientRange(-1,0,"#000000","#FF0000","#FFFFFF"),e.addGradientRange(0,1,"#000000","#FFFFFF","#00FF00"),e.addGradientRange(1,null,"#000000","#00FF00","#00FF00"),e};class d{constructor(e){const[t,i,r,n]=e.symbol.split("-");this.id=e.symbol,this.symbol=t,this.rawDate=i,this.strike=parseFloat(r),this.type="P"===n?"PUT":"CALL",this.expirationDate=function(e){const[t,i,r,n]=e.match(/^(\d+)([A-Z]+)(\d+)$/);return new Date(parseInt("20"+n),function(e){switch(e){case"JAN":return 0;case"FEB":return 1;case"MAR":return 2;case"APR":return 3;case"MAY":return 4;case"JUN":return 5;case"JUL":return 6;case"AUG":return 7;case"SEP":return 8;case"OCT":return 9;case"NOV":return 10;case"DEC":return 11}throw new Error("Unexpected month: ["+e+"]")}(r),parseInt(i))}(i),this.DTE=Math.ceil((this.expirationDate-new Date)/864e5),this.bidPrice=parseFloat(e.bid1Price),this.bidSize=parseFloat(e.bid1Size),this.markPrice=parseFloat(e.markPrice),this.askPrice=parseFloat(e.ask1Price),this.askSize=parseFloat(e.ask1Size),this.underlyingPrice=parseFloat(e.indexPrice),this.annualizedMaxGain=365*this.maxGain/this.DTE,this.maxGainAsChange=this.strike/this.underlyingPrice-1,this.premiumAsKind=this.premium/this.underlyingPrice}get isPut(){return"PUT"===this.type}get isCall(){return"CALL"===this.type}get maxGain(){return this.premium}get premium(){return this.bidPrice}get breakEvenAsChange(){return this.breakEven/this.underlyingPrice-1}priceToOpen(e){return p.fromMarket(e,this.bidPrice,this.markPrice,this.askPrice)}priceToClose(e,t){return p.fromExercise(-e,this.moneyness(t))}}class m extends d{constructor(e){super(e),this.breakEven=this.strike-this.premium,this.maxLoss=this.breakEven,this.maxGainRatio=this.maxGain/this.maxLoss,this.breakEvenVsHodler=this.underlyingPrice*(1+this.maxGainRatio),this.gainAtCurrentPrice=Math.min(this.underlyingPrice-this.breakEven,this.maxGain),this.gainAtCurrentPriceRatio=this.gainAtCurrentPrice/this.maxLoss,this.annualizedMaxGainRatio=365*this.maxGainRatio/this.DTE}moneyness(e){return Math.max(0,this.strike-e)}}class h extends d{constructor(e){super(e),this.breakEven=this.strike+this.premium,this.gainAtCurrentPrice=Math.min(this.breakEven-this.underlyingPrice,this.maxGain),this.breakEvenVsShorter=this.underlyingPrice-this.premium}get breakEvenWithPremiumAsKind(){return this.strike/(1-this.premiumAsKind)}get breakEvenAsChangeWithPremiumAsKind(){return this.breakEvenWithPremiumAsKind/this.underlyingPrice-1}moneyness(e){return Math.max(0,e-this.strike)}}class p{constructor(e=0,t=e){this.fair=e,this.pessimistic=t,this.fairAsBet=e+1,this.pessimisticAsBet=t+1}copy(){return new p(this.fair,this.pessimistic)}add(e){return this.fair+=e.fair,this.pessimistic+=e.pessimistic,this}static fromMarket(e,t,i,r){return new p(-e*i,e>=0?-e*Math.max(i,r):-e*Math.min(t,i))}static fromExercise(e,t){return p.fromMarket(e,t,t,t)}}class b{constructor(){this.positions=new Map}addLeg(e,t=0){if(void 0===this.symbol)this.symbol=e.symbol,this.rawDate=e.rawDate,this.DTE=e.DTE,this.underlyingPrice=e.underlyingPrice;else if(this.symbol!==e.symbol||this.rawDate!==e.rawDate)throw new Error(`Cannot mix different symbols or expirations: ${this.symbol}-${this.rawDate} vs ${e.symbol}-${e.rawDate}`);return this.positions.set(e,(this.positions.get(e)||0)+t),this}maxSize(){let e=Number.MAX_VALUE;return this.positions.forEach(((t,i)=>{t<0?e=Math.min(e,i.bidSize):t>0&&(e=Math.min(e,i.askSize))})),e}priceToOpen(e=new p,t=(()=>{})){return this.positions.forEach(((i,r)=>{const n=r.priceToOpen(i);t(i,r,n),e.add(r.priceToOpen(i))})),e}priceToClose(e,t=new p,i=(()=>{})){return this.positions.forEach(((r,n)=>{const s=n.priceToClose(r,e);i(r,n,s),t.add(s)})),t}}class f{constructor(e,t,i){this.strategy=e,this.bestStrike=t,this.worstStrike=i;const r=t>i;let n="<ol>";const s=(e,t,i)=>{n+="<ul><li>",n+=`<b>${e} of ${t.id}</b>: value will be <b>$${i.pessimistic}</b>.`,n+="</li></ul>"},a=this.strategy.priceToOpen(new p,((e,t,i)=>{0!==e&&(n+="<li>",n+=`You <b>${e>0?"BUY":"SELL"}</b> ${Math.abs(e)} of this option: <b>${t.id}</b>.`,n+=`You should ${e>0?"pay":"receive"} about $${Math.abs(i.fair).toFixed(1)}, `,n+=`or at ${e>0?"most":"least"} $<b>${Math.abs(i.pessimistic).toFixed(1)}</b> via a market order.`,n+="</li>")})),o=a.pessimistic<0;n+=`</ol><p><hr>Thus to open the trade, you will <b>${o?"pay":"receive"} `,n+=`$${Math.abs(a.pessimistic).toFixed(1)}, net.</b></p>`,n+=`<hr><p>Then, at expiration (on ${e.rawDate}), there are two outcomes:</p><ul>`,n+=`<li>The <b>best outcome</b> is that ${e.symbol} will be at <b>$${t}</b> (or `,n+=(t>i?"above":"below")+"). Then this will be the value of your positions:";const l=this.strategy.priceToClose(t,new p,s);n+=`<p>That is, a total value of <b>$${l.pessimistic.toFixed(1)}</b>. `,n+="Together with the opening trade, the final P&L would be: ";const u=a.copy().add(l);n+=`$<b>${u.fair.toFixed(1)}</b> or at worst (with market orders) <b>$${u.pessimistic.toFixed(1)}</b></p></li>`,n+=`<li>The <b>worst outcome</b> is that ${e.symbol} will be at <b>$${i}</b> (or `,n+=(i<t?"below":"above")+"). Then this will be the value of your positions:";const c=this.strategy.priceToClose(i,new p,s);n+=`<p>That is, a total value of <b>$${c.pessimistic.toFixed(1)}</b>. `,n+="Together with the opening trade, the final P&L would be: ";const d=a.copy().add(c);n+=`<b>$${d.fair.toFixed(1)}</b> or at worst (with market orders) <b>$${d.pessimistic.toFixed(1)}</b></p></li>`,n+="</li></ul>",this.earnedYield=new p(-u.fair/d.fair,-u.pessimistic/d.pessimistic),n=`<p>How to create this position: <b>${e.symbol}</b> (currently at <b>$${e.underlyingPrice}</b>) <b>${r?"OVER":"UNDER"} $${t} after ${e.DTE} days</b> (${e.rawDate}), which should yield (if you win) a profit of at least <b>${(100*this.earnedYield.pessimistic).toFixed(1)}%</b></p>`+n,n+=`<p><b>Hence</b>, given that the MaxGain is $${u.fair.toFixed(1)} (or at worst $${u.pessimistic.toFixed(1)}), `,n+=`and the MaxLoss is $${d.fair.toFixed(1)} (or at worst $${d.pessimistic.toFixed(1)}), `,n+=`the yield of this bet (if you win it) is ${(100*this.earnedYield.fair).toFixed(1)}% `,n+=`or at least <b>${(100*this.earnedYield.pessimistic).toFixed(1)}%</b>, with market orders.`,this.explanationHtml=n}static createOver(e,t){const[i,r]=f.lowStrikeFirst(e,t),n=Math.min(1,i.askSize,r.bidSize);return new f((new b).addLeg(r,-n).addLeg(i,n),r.strike,i.strike)}static createUnder(e,t){const[i,r]=f.lowStrikeFirst(e,t),n=Math.min(1,i.bidSize,r.askSize);return new f((new b).addLeg(i,-n).addLeg(r,n),i.strike,r.strike)}static lowStrikeFirst(e,t){if(e.type!==t.type||e.strike===t.strike)throw new Error(`Can only build a spread from options of the same symbol, same type, different strike: ${e.id}, ${t.id} `);return e.strike<t.strike?[e,t]:[t,e]}}function g(d){(async function(e="BTC"){try{const t=await async function(e){const t=JSON.parse(localStorage.getItem(e));if(t&&Date.now()<t.expirationTimestamp)return console.log("Using cache"),console.log(t.response),t.response;const i=await fetch("https://api.bybit.com/v5/market/tickers?category=option&baseCoin="+e),r=JSON.parse(await i.text());if(0!==r.retCode)throw new Error("ByBit returned error: "+r.retMsg);return localStorage.setItem(e,JSON.stringify({response:r,expirationTimestamp:Date.now()+6e5})),console.log("Using API; populating cache"),console.log(r),r}(e);if(0!==t.retCode)throw new Error("ByBit returned error: "+t.retMsg);const i=t.result.list.map((e=>function(e){const[,,,t]=e.symbol.split("-");if("P"===t)return new m(e);if("C"===t)return new h(e);throw new Error(`Unexpected option type ${t}, from struct: ${e.symbol}`)}(e)));i.length||alert("No option fetched from ByBit (you probably got rate limited...try again later)");const r=i.filter((e=>e.isPut)),n=i.filter((e=>e.isCall));return r.sort(E),n.sort(E),{puts:r,calls:n}}catch(e){return console.error(e.stack),alert(`Error fetching Bybit data: ${e}`),[e]}})(d).then((({puts:m,calls:h})=>{if(m){const e=t().formatValue(m[0].underlyingPrice);document.getElementById(`${d}_price`).textContent=`${e}`}!function(i,r,s){new e({frozenColumns:4,frozenRows:1}).defineColumn("EXPIRATION<br>DATE",(e=>e.expirationDate),"date").defineColumn("DTE",(e=>e.DTE),"number").defineColumn(`${i} PUT<br>STRIKE`,(e=>e.strike),"number",t()).defineColumn("PREMIUM ($)<br>(=MAX GAIN)",(e=>e.maxGain),"number",t()).defineColumn("BREAKEVEN ($)<br>(=MAX LOSS)",(e=>e.breakEven),"number",t()).defineColumn("BREAKEVEN (%)",(e=>e.breakEvenAsChange),"number",n(),u()).defineColumn("MAX GAIN (%)",(e=>e.maxGainRatio),"number",n(),l()).defineColumn("MAX GAIN<br>WHEN "+i+"<br>PERFORMS BETTER<br>THAN (%)",(e=>e.maxGainAsChange),"number",n(),u()).defineColumn("BREAKEVEN<br>VS HODLER",(e=>e.breakEvenVsHodler),"number",t()).defineColumn("APR (%)",(e=>e.annualizedMaxGainRatio),"number",n(),c()).format(r,s)}(d,m,`${d}_puts_table`),function(i,r,s,a){new e({frozenColumns:4,frozenRows:1}).defineColumn("EXPIRATION DATE",(e=>e.expirationDate),"date").defineColumn("DAYS TILL EXPIRATION",(e=>e.DTE),"number").defineColumn(`${i} CALL<br>STRIKE`,(e=>e.strike),"number",t()).defineColumn("PREMIUM ($)",(e=>e.maxGain),"number",t()).defineColumn("BREAKEVEN ($)",(e=>e.breakEven),"number",t()).defineColumn("BREAKEVEN (%)",(e=>e.breakEvenAsChange),"number",n(),c()).defineColumn(`PREMIUM (${i})`,(e=>e.premiumAsKind),"number",r).defineColumn(`BREAKEVEN ($, when premium=${i})`,(e=>e.breakEvenWithPremiumAsKind),"number",t()).defineColumn(`BREAKEVEN (%, when premium=${i})`,(e=>e.breakEvenAsChangeWithPremiumAsKind),"number",n(),c()).format(s,a)}(d,"BTC"===d?i():r(),h,`${d}_calls_table`),function(e,i,r){const s={fontSize:18,bold:!0},o={title:`All ${e} Puts (Each line is an expiration date, N days from today)`,titleTextStyle:{fontSize:24,bold:!0},hAxis:{title:`$ Strike (the price you promise to buy ${e} at)`,format:"$#,###",direction:-1,titleTextStyle:s},vAxis:{title:"Max Gain %",format:"#,###%",titleTextStyle:s},legend:{position:"top"},curveType:"function",pointSize:5},l=new google.visualization.DataTable;l.addColumn({type:"number",pattern:"$#,###"});const u=new Map;i.forEach((e=>{u.has(e.DTE)||(u.set(e.DTE,u.size),l.addColumn({type:"number",label:`${e.DTE}`,pattern:"$#,###"}),l.addColumn({role:"tooltip"}))}));const c=new Map;i.filter((e=>e.strike>e.underlyingPrice)).forEach((e=>c.set(e.DTE,Math.min(e.strike,c.get(e.DTE)||e.strike)))),i.filter((e=>e.strike<=(c.get(e.DTE)||0))).forEach((e=>{const i=Array(1+2*u.size);i[0]=e.strike;const r=u.get(e.DTE);i[1+2*r+0]=e.maxGainRatio,i[1+2*r+1]=`Strike: ${t().formatValue(e.strike)}\nExpiration: ${a().formatValue(e.expirationDate)}\nBreakEven: ${t().formatValue(e.breakEven)}\nMax gain: ${n().formatValue(e.maxGainRatio)}`,l.addRows([i])})),new google.visualization.LineChart(document.getElementById(r)).draw(l,o)}(d,m,`${d}_puts_chart`),function(e,i,r){const s={fontSize:18,bold:!0},o={title:`All ${e} Calls (Each line is an expiration date, N days from today)`,titleTextStyle:{fontSize:24,bold:!0},hAxis:{title:`$ Strike (the price you promise to sell ${e} at)`,format:"$#,###",direction:1,titleTextStyle:s},vAxis:{title:"Premium ($)",format:"$#,###",titleTextStyle:s},legend:{position:"top"},curveType:"function",pointSize:5},l=new google.visualization.DataTable;l.addColumn({type:"number",pattern:"$#,###"});const u=new Map;i.forEach((e=>{u.has(e.DTE)||(u.set(e.DTE,u.size),l.addColumn({type:"number",label:`${e.DTE}`,pattern:"$#,###"}),l.addColumn({role:"tooltip"}))}));const c=new Map;i.filter((e=>e.strike<e.underlyingPrice)).forEach((e=>c.set(e.DTE,Math.max(e.strike,c.get(e.DTE)||e.strike)))),i.filter((e=>e.strike>=(c.get(e.DTE)||0))).forEach((e=>{const i=Array(1+2*u.size);i[0]=e.strike;const r=u.get(e.DTE);i[1+2*r+0]=e.premium,i[1+2*r+1]=`Strike: ${t().formatValue(e.strike)}\nExpiration: ${a().formatValue(e.expirationDate)}\nBreakEven: ${t().formatValue(e.breakEven)}\nBreakEven As Change: ${n().formatValue(e.breakEvenAsChange)}`,l.addRows([i])})),new google.visualization.LineChart(document.getElementById(r)).draw(l,o)}(d,h,`${d}_calls_chart`),function(i,r,n,a,l){const u=r[0].underlyingPrice;function c(e){const t=new Map;return e.forEach((e=>{const i=e.DTE;t.set(i,t.get(i)||[]),t.get(i).push(e)})),t}const d=c(r),m=c(n);const{allDTEs:h,allStrikes:p}=function(e){const t=new Set,i=new Set;return e.forEach((e=>{t.add(e.DTE),i.add(e.strike)})),{allDTEs:t,allStrikes:i}}(r);const b=new Map;h.forEach((e=>{const t=d.get(e),i=m.get(e);function r(e=[]){return e.reduce(((e,t)=>(e[t.strike]=t,e)),{})}const n=r(t),s=r(i),a=t.map((e=>e.strike)).sort(w()),o=new Map,l=new Map,c=new Map,h=(e,t,i)=>{e.earnedYield?.pessimisticAsBet>1&&(t.set(e.bestStrike,e),e.earnedYield?.pessimisticAsBet>2&&i.set(e.bestStrike,e))};(function(e){const t=e.map(((e,t,i)=>[i[t],i[t+1]]));return t.pop(),t})(a).forEach((([e,t])=>{const i=[n[e],n[t]].filter((e=>void 0!==e)),r=[s[e],s[t]].filter((e=>void 0!==e));let a=i;u<t&&2===r.length&&(a=r),2===a.length&&(h(f.createOver(...a),o,c),h(f.createUnder(...a),l,c))})),b.set(e,{strikeToOverBets:o,strikeToUnderBets:l,strikeToTouchBets:c})}));const g=new e({frozenColumns:1,frozenRows:1,title:`All ${i} "Over" and "Under" bets (spreads). Each bet corresponds to a pair of puts; one bought and one`}).defineColumn(`${i} price`,(e=>e),"number",t()),E=new e({frozenColumns:1,frozenRows:1,title:`All ${i} "Touch" bets. If the price ever touches the target before expiration, it wins`}).defineColumn(`${i} price`,(e=>e),"number",t()),$=[...p].sort(w(!1)),k=[...h].sort(w(!1));k.forEach((e=>{g.defineColumn(`${e}⬆️`,(t=>b.get(e).strikeToOverBets.get(t)?.earnedYield?.pessimisticAsBet||void 0),"number",s(),o()),g.defineColumn(`⬇️${e}`,(t=>b.get(e).strikeToUnderBets.get(t)?.earnedYield?.pessimisticAsBet||void 0),"number",s(),o()),E.defineColumn(`${e}`,(t=>b.get(e).strikeToTouchBets.get(t)?.earnedYield?.pessimisticAsBet/2||void 0),"number",s(),o())}));const{table:y}=g.format($,a);google.visualization.events.addListener(y,"select",(()=>{const e=y.getSelection();if(!e.length)return;const t=e[0].row,i=window.event.target.cellIndex,r=k[Math.trunc((i-1)/2)],n=i%2==0,s=$[t],o=b.get(r),l=(n?o.strikeToUnderBets:o.strikeToOverBets).get(s);document.getElementById(`${a}_explanation`).innerHTML=l.explanationHtml}));const{touchTable:F}=E.format($,l)}(d,m,h,`${d}_spreads_table`,`${d}_touch_table`)}),(e=>{console.error(e.stack),alert(`Error: ${e}`)}))}function E(e,t){return e.DTE!==t.DTE?t.DTE-e.DTE:e.strike!==t.strike?e.isPut?e.strike-t.strike:t.strike-e.strike:-1}function w(e=!0){return(t,i)=>e?t-i:i-t}google.charts.load("current",{packages:["corechart","table"]}),google.charts.setOnLoadCallback((()=>{g("BTC"),g("ETH")}))})();