require('dotenv').config();
const BigNumber = require("bignumber.js");

const Web3 = require('web3');
const web3 = new Web3(
    new Web3.providers.HttpProvider(process.env.MAINNET_FORK)
);

const LIQUIDITY_AMOUNT_WBNB = 100
const LIQUIDITY_AMOUNT_GUE = 1000000000

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

    const admin = (await web3.eth.getAccounts())[0];
    console.log('admin', admin)

    const networkId = await web3.eth.net.getId();
    console.log('networkId', networkId)

    const gueAddress = GUE.networks[networkId].address
    const gueContract = new web3.eth.Contract(
        GUE.abi,
        gueAddress
    );

    // console.log('------------------------------------')
    // console.log('convert BNB to WBNB...')
    // await wbnbContract.methods.deposit().send({
    //     value: toWei(LIQUIDITY_AMOUNT_WBNB, wbnbDecimals),
    //     from: admin,
    //     gas: 1000000
    // })

    console.log('------------------------------------')
    console.log('approving WBNB...')
    await wbnbContract.methods.approve(
        process.env.PCS_ROUTER,
        toWei(LIQUIDITY_AMOUNT_WBNB, wbnbDecimals)
    ).send({
        from: admin,
        gas: 1000000
    })

    console.log('approving GUE...')
    await gueContract.methods.approve(
        process.env.PCS_ROUTER,
        toWei(LIQUIDITY_AMOUNT_GUE, gueDecimals)
    ).send({
        from: admin,
        gas: 1000000
    })

    console.log('------------------------------------')
    console.log('estimateGas addLiquidity...')
    await pancakeRouter.methods.addLiquidityETH(
        gueAddress,
        toWei(LIQUIDITY_AMOUNT_WBNB, wbnbDecimals),
        1,
        1,
        admin,
        Math.floor((Date.now() / 1000)) + 60 * 10
    ).estimateGas({
        value: toWei(LIQUIDITY_AMOUNT_WBNB, gueDecimals),
        from: admin,
    });


    console.log('------------------------------------')
    console.log('send addLiquidity...')
    await pancakeRouter.methods.addLiquidityETH(
        gueAddress,
        toWei(LIQUIDITY_AMOUNT_GUE, gueDecimals),
        1,
        1,
        admin,
        Math.floor((Date.now() / 1000)) + 60 * 10
    ).send({
        value: toWei(LIQUIDITY_AMOUNT_WBNB, gueDecimals),
        from: admin,
        gasPrice: await web3.eth.getGasPrice(),
        gas: 5000000
    });


    // console.log('------------------------------------')
    // console.log('estimateGas addLiquidity...')
    // await pancakeRouter.methods.addLiquidity(
    //     wbnbAddress,
    //     gueAddress,
    //     toWei(LIQUIDITY_AMOUNT_WBNB, wbnbDecimals),
    //     toWei(LIQUIDITY_AMOUNT_GUE, gueDecimals),
    //     1,
    //     1,
    //     admin,
    //     Math.floor((Date.now() / 1000)) + 60 * 10
    // ).estimateGas({
    //     from: admin,
    // });


    // console.log('------------------------------------')
    // console.log('send addLiquidity...')
    // await pancakeRouter.methods.addLiquidity(
    //     wbnbAddress,
    //     gueAddress,
    //     toWei(LIQUIDITY_AMOUNT_WBNB, wbnbDecimals),
    //     toWei(LIQUIDITY_AMOUNT_GUE, gueDecimals),
    //     1,
    //     1,
    //     admin,
    //     Math.floor((Date.now() / 1000)) + 60 * 10
    // ).send({
    //     from: admin,
    //     gasPrice: await web3.eth.getGasPrice(),
    //     gas: 5000000
    // });


    console.log('------------------------------------')
    console.log('get pair contract...')
    const pairAddress = await pancakeFactory.methods.getPair(wbnbAddress, gueAddress).call()
    console.log('pairAddress', pairAddress)
    const pairContract = new web3.eth.Contract(
        PCS_PAIR_ABI,
        pairAddress
    );


    console.log('------------------------------------')
    console.log('get LP balance...')
    const lpBalance = await pairContract.methods.balanceOf(admin).call()
    console.log('LP Admin Balance:', toNormal(lpBalance, wbnbDecimals).toFixed(), 'GUE/WBNB');

    console.log('------------------------------------')
    console.log('get pair reserve..')
    const reserve = await pairContract.methods.getReserves().call()
    console.log('   reserve0  : ', toNormal(reserve._reserve0, wbnbDecimals).toFixed(), 'GUE')
    console.log('   reserve1  : ', toNormal(reserve._reserve1, gueDecimals).toFixed(), 'WBNB')

    console.log('------------------------------------')
    console.log('check initial price..')
    let price = await pancakeRouter.methods.getAmountsOut(
        toWei(1, gueDecimals), [gueAddress, wbnbAddress]
    ).call()
    console.log('1 GUE = ', toNormal(price[1], gueDecimals).toFixed(), 'BNB')

}

init();