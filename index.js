require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const abis = require('./abis');
const tools = require("./checkArb");

const { mainnet: addresses } = require('./addresses');
//const Flashswap = require('./build/contracts/Flashswap.json');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.BSC_WSS)
);
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY)

// we need pancakeSwap
const pancakeFactory = new web3.eth.Contract(
    abis.pancakeFactory.pancakeFactory,
    addresses.pancake.factory
);
const pancakeRouter = new web3.eth.Contract(
    abis.pancakeRouter.pancakeRouter,
    addresses.pancake.router
);

// we need bakerySwap
/* const bakeryFactory = new web3.eth.Contract(
    abis.bakeryFactory.bakeryFactory,
    addresses.bakery.factory
);
const bakeryRouter = new web3.eth.Contract(
    abis.bakeryRouter.bakeryRouter,
    addresses.bakery.router
); */

// use ApeSwap instead of bakerySwap
const apeFactory = new web3.eth.Contract(
    abis.apeFactory.apeFactory,
    addresses.ape.factory
);
const apeRouter = new web3.eth.Contract(
    abis.apeRouter.apeRouter,
    addresses.ape.router
);
const biFactory = new web3.eth.Contract(
    abis.biSwapFactory.biSwapFactory,
    addresses.biSwap.factory
);
const biRouter = new web3.eth.Contract(
    abis.biSwapRouter.biSwapRouter,
    addresses.biSwap.router
);


const Dex1 = 'BiSwap'
const Factory1 = biFactory;
const Router1 = biRouter;

const Dex2 = 'Pancake'
const Factory2 = pancakeFactory;
const Router2 = pancakeRouter;

const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

const fromTokens = ['WBNB'];
const fromToken = [
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB 

];
const fromTokenDecimals = [18,18];

const toTokens = ['ETH', 'BSW', 'CAKE','TBL','TMT'];
const toToken = [
    '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // ETH
    '0x965F527D9159dCe6288a2219DB51fc6Eef120dD1', // BSW
    '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', // CAKE
    '0x59F6B2435Cd1421f409907aD2D9F811849ca555f',
    '0x4803Ac6b79F9582F69c4fa23c72cb76dD1E46d8d'
];

const toTokenDecimals = [18,18,18];
const amount = process.env.BNB_AMOUNT;

const init = async () => {
    const networkId = await web3.eth.net.getId();
/*
    const flashswap = new web3.eth.Contract(
        Flashswap.abi,
        Flashswap.networks[networkId].address
    );*/

    let subscription = web3.eth.subscribe('newBlockHeaders', (error, result) => {
        if (!error) {
            // console.log(result);
            return;
        }
        console.error(error);
    })
    .on("connected", subscriptionId => {
        console.log(`You are connected on ${subscriptionId}`);
    })
    .on('data', async block => {
        console.log('-------------------------------------------------------------');
        console.log(`New block received. Block # ${block.number}`);
        console.log(`GasLimit: ${block.gasLimit} and Timestamp: ${block.timestamp}`);

        for (let i = 0; i < fromTokens.length; i++) {
            for (let j = 0; j < toTokens.length; j++) {
             
                
                //START CHECKING ARBITRAGE OPPORTUNITY
               trade1 = await tools.checkArbitrage(Dex1,Factory1,Router1,Dex2,Router2,fromTokens[i],fromToken[i],18,amount,toTokens[j],toToken[j],18,BigNumber,block);
                
               setTimeout(function() {
               }, 3000);
               //check the other way
               trade2 = await tools.checkArbitrage(Dex2,Factory2,Router2,Dex1,Router1,fromTokens[i],fromToken[i],18,amount,toTokens[j],toToken[j],18,BigNumber,block);
                /*
                console.log(`Trading ${toTokens[j]}/${fromTokens[i]} ...`);

                //const pairAddress = await pancakeFactory.methods.getPair(fromToken[i], toToken[j]).call();
                //try to switch
                const pairAddress = await Factory1.methods.getPair(fromToken[i], toToken[j]).call();
                console.log(`pairAddress ${toTokens[j]}/${fromTokens[i]} is ${pairAddress}`);
                const unit0 = await new BigNumber(amount);
                const amount0 = await new BigNumber(unit0).shiftedBy(fromTokenDecimals[i]);
                console.log(`Input amount of ${fromTokens[i]}: ${unit0.toString()}`);

                // The quote currency needs to be WBNB
                let tokenIn, tokenOut;
                if (fromToken[i] === WBNB) {
                    tokenIn = fromToken[i];
                    tokenOut = toToken[j];
                } else if (toToken[j] === WBNB) {
                    tokenIn = toToken[j];
                    tokenOut = fromToken[i];
                } else {
                    return;
                }

                // The quote currency is not WBNB
                if (typeof tokenIn === 'undefined') {
                    return;
                }

                console.log('debug1');
                // call getAmountsOut in PancakeSwap
                const amounts = await Router1.methods.getAmountsOut(amount0, [tokenIn, tokenOut]).call();
                console.log(amounts);
                
                const unit1 = await new BigNumber(amounts[1]).shiftedBy(-toTokenDecimals[j]);
                const amount1 = await new BigNumber(amounts[1]);
                console.log(`
                    Buying token at Exchange 1
                    =================
                    tokenIn: ${unit0.toString()} ${fromTokens[i]}
                    tokenOut: ${unit1.toString()} ${toTokens[j]}
                `);

                // call getAmountsOut in ApeSwap
                const amounts2 = await Router2.methods.getAmountsOut(amount1, [tokenOut, tokenIn]).call();
                const unit2 = await new BigNumber(amounts2[1]).shiftedBy(-fromTokenDecimals[i]);
                const amount2 = await new BigNumber(amounts2[1]);
                console.log(`
                    Buying back token at Exchange 2
                    =================
                    tokenOut: ${unit1.toString()} ${toTokens[j]}
                    tokenIn: ${unit2.toString()} ${fromTokens[i]}
                `);

                let profit = await new BigNumber(amount2).minus(amount0);
                let unit3  = await new BigNumber(unit2).minus(unit0);

                if (profit > 0) {
                  /*  const tx = flashswap.methods.startArbitrage(
                        tokenIn,
                        tokenOut,
                        amount0,
                        0
                    );*/

                    /* const [gasPrice, gasCost] = await Promise.all([
                        web3.eth.getGasPrice(),
                        tx.estimateGas({from: admin}),
                    ]); */
                    /*
                    let gasPrice = 5000000000; // 5Gwei
                    let gasCost  = 510000;

                    const txCost = await web3.utils.toBN(gasCost) * web3.utils.toBN(gasPrice);
                    profit = await new BigNumber(profit).minus(txCost);

                    if (profit > 0) {
                        console.log(`Block # ${block.number}: Arbitrage opportunity found! Expected profit: ${profit}`);
                        const data = tx.encodeABI();
                      /*  const txData = {
                            from: admin,
                            to: flashswap.options.address,
                            data,
                            gas: gasCost,
                            gasPrice: gasPrice,
                        };*/
                /*        const receipt = await web3.eth.sendTransaction(txData);
                        console.log(`Transaction hash: ${receipt.transactionHash}`);
                    } else {
                        console.log('Transaction cost did not cover profits');
                    }
                } else {
                    console.log(`Block # ${block.number}: Arbitrage opportunity not found! Expected profit: ${profit}`);
                }*/
                
            }
        }
    })
    .on('error', error => {
        console.log(error);
    });
}

init();
