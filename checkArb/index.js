async function checkArbitrage(Dex1, factory1, router1, Dex2, router2, fromTokennName, fromTokenAddress, fromTokenDecimals, amount,
    totokenName, toTokenAddress, toTokenDecimals, BigNumber, block){
        const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
        

        //START CHECKING ARBITRAGE OPPORTUNITY
        console.log(`Trading ${totokenName}/${fromTokennName} ...`);

        const pairAddress = await factory1.methods.getPair(fromTokenAddress, toTokenAddress).call();
        console.log(`pairAddress ${totokenName}/${fromTokennName} is ${pairAddress}`);
        const unit0 = await new BigNumber(amount);
        const amount0 = await new BigNumber(unit0).shiftedBy(fromTokenDecimals);
        console.log(`Input amount of ${fromTokennName}: ${unit0.toString()}`);

        // The quote currency needs to be WBNB
        let tokenIn, tokenOut;
        if (fromTokenAddress === WBNB) {
            tokenIn = fromTokenAddress;
            tokenOut = toTokenAddress;
        } else if (toTokenAddress === WBNB) {
            tokenIn = toTokenAddress;
            tokenOut = fromTokenAddress;
        } else {
            return;
        }

        // The quote currency is not WBNB
        if (typeof tokenIn === 'undefined') {
            return;
        }


        // call getAmountsOut in PancakeSwap
        const amounts = await router1.methods.getAmountsOut(amount0, [tokenIn, tokenOut]).call();
        const unit1 = await new BigNumber(amounts[1]).shiftedBy(-toTokenDecimals);
        const amount1 = await new BigNumber(amounts[1]);
        console.log(`
            Buying token at ${Dex1}
            =================
            tokenIn: ${unit0.toString()} ${fromTokennName}
            tokenOut: ${unit1.toString()} ${totokenName}
        `);

        // call getAmountsOut in ApeSwap
        const amounts2 = await router2.methods.getAmountsOut(amount1, [tokenOut, tokenIn]).call();
        const unit2 = await new BigNumber(amounts2[1]).shiftedBy(-fromTokenDecimals);
        const amount2 = await new BigNumber(amounts2[1]);
        console.log(`
            Buying back token at ${Dex2}
            =================
            tokenOut: ${unit1.toString()} ${totokenName}
            tokenIn: ${unit2.toString()} ${fromTokennName}
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
                const receipt = await web3.eth.sendTransaction(txData);
                console.log(`Transaction hash: ${receipt.transactionHash}`);
            } else {
                console.log('Transaction cost did not cover profits');
            }
        } else {
            console.log(`Block # ${block.number}: Arbitrage opportunity not found! Expected profit: ${profit}`);
        }   

}

module.exports = { checkArbitrage };