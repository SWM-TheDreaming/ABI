import Web3 from 'web3';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const singleWeb3 = new Web3(new Web3.providers.HttpProvider(process.env.BLOCK_CHAIN_HTTP_PROVIDER));
export default singleWeb3;