require('dotenv').config();
const BigNumber = require("bignumber.js");

const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.HttpProvider(process.env.MAINNET_FORK)
);

const SELL_AMOUNT_GUE = 9800000
const wbnbDecimals = 18
const gueDecimals = 18

const IERC20 = require("./build/contracts/IERC20.json");
const GUE = require("./build/contracts/GUE.json");
const PCS_ROUTER_ABI = require("./abis/pcs_router.json");
const PCS_FACTORY_ABI = require("./abis/pcs_factory.json");
const PCS_PAIR_ABI = require("./abis/pcs_pair.json");

const wbnbAddress = process.env.WBNB
const wbnbContract = new web3.eth.Contract(
    IERC20.abi,
    wbnbAddress
);

const pancakeRouter = new web3.eth.Contract(
    PCS_ROUTER_ABI,
    process.env.PCS_ROUTER
);

const pancakeFactory = new web3.eth.Contract(
    PCS_FACTORY_ABI,
    process.env.PCS_FACTORY
);

const toWei = (amount, decimals) => {
    return new BigNumber(amount).shiftedBy(decimals)
}
const toNormal = (amount, decimals) => {
    return new BigNumber(amount).shiftedBy(-decimals)
}

const init = async() => {

    // the second account
    const admin = (await web3.eth.getAccounts())[1];
    console.log('admin', admin)

    const networkId = await web3.eth.net.getId();
    console.log('networkId', networkId)

    const gueAddress = GUE.networks[networkId].address
    const gueContract = new web3.eth.Contract(
        GUE.abi,
        gueAddress
    );


    console.log('------------------------------------')
    console.log('get pair contract...')
    const pairAddress = await pancakeFactory.methods.getPair(wbnbAddress, gueAddress).call()
    console.log('pairAddress', pairAddress)
    const pairContract = new web3.eth.Contract(
        PCS_PAIR_ABI,
        pairAddress
    );

    console.log('------------------------------------')
    console.log('get initial pair reserve..')
    let reserve = await pairContract.methods.getReserves().call()
    console.log('   reserve0  : ', toNormal(reserve._reserve0, wbnbDecimals).toFixed(), 'GUE')
    console.log('   reserve1  : ', toNormal(reserve._reserve1, gueDecimals).toFixed(), 'WBNB')



    console.log('------------------------------------')
    console.log('check initial price before sell..')
    let price = await pancakeRouter.methods.getAmountsOut(
        toWei(1, gueDecimals), [gueAddress, wbnbAddress]
    ).call()
    console.log('1 GUE = ', toNormal(price[1], gueDecimals).toFixed(), 'BNB')



    console.log('-----------------------------------------')
    console.log(`approving ${SELL_AMOUNT_GUE} GUE`)
    await gueContract.methods.approve(
        process.env.PCS_ROUTER,
        toWei(SELL_AMOUNT_GUE, gueDecimals)
    ).send({
        from: admin
    })


    console.log('------------------------------------')
    let amountOut = SELL_AMOUNT_GUE * toNormal(price[1], gueDecimals)
    console.log(`approving ${amountOut} WBNB...`)
    await wbnbContract.methods.approve(
        process.env.PCS_ROUTER,
        toWei(amountOut, wbnbDecimals)
    ).send({
        from: admin,
        gas: 1000000
    })


    console.log('-----------------------------------------')
    console.log(`selling ${SELL_AMOUNT_GUE} GUE`)

    await pancakeRouter.methods.swapExactTokensForTokens(
        toWei(SELL_AMOUNT_GUE, gueDecimals),
        0, [gueAddress, wbnbAddress],
        admin,
        Math.floor((Date.now() / 1000)) + 60 * 10
    ).send({
        from: admin,
        gasPrice: await web3.eth.getGasPrice(),
        gas: 5000000
    });

    console.log('-----------------------------------------')
    let balance = await gueContract.methods.balanceOf(admin).call()
    console.log('admin GUE balance', toNormal(balance, gueDecimals).toFixed())

    balance = await wbnbContract.methods.balanceOf(admin).call()
    console.log('admin WBNB balance', toNormal(balance, gueDecimals).toFixed())




    console.log('------------------------------------')
    console.log('get ending pair reserve..')
    reserve = await pairContract.methods.getReserves().call()
    console.log('   reserve0  : ', toNormal(reserve._reserve0, wbnbDecimals).toFixed(), 'GUE')
    console.log('   reserve1  : ', toNormal(reserve._reserve1, gueDecimals).toFixed(), 'WBNB')

    console.log('------------------------------------')
    console.log('check ending price..')
    price = await pancakeRouter.methods.getAmountsOut(
        toWei(1, gueDecimals), [gueAddress, wbnbAddress]
    ).call()
    console.log('1 GUE = ', toNormal(price[1], gueDecimals).toFixed(), 'BNB')


}

init();