source .env
npx ganache-cli --fork $MORALIS_BSC \
--unlock $WBNB_WHALE \
--unlock $BUSD_WHALE
