import express from 'express';
import * as fs from 'fs';
import solc from 'solc';
import dotenv from 'dotenv';
import { createRequire } from  'module';
import Web3 from 'web3';
import { Chain, Common, Hardfork } from '@ethereumjs/common';
import { Transaction } from '@ethereumjs/tx';

import sqlCon from '../db/sqlCon.js'
import templateContract from '../contractModules/contractWriter.js';




dotenv.config({ path: '../.env' });

const singleWeb3 = new Web3(new Web3.providers.HttpProvider(process.env.BLOCK_CHAIN_HTTP_PROVIDER));

const conn = sqlCon();
const router = express.Router();



const privateKey = Buffer.from(process.env.SEND_ACCOUNT_PK,'hex');

/* GET home page. */
router.post('/write', async function(req, res, next) {
  try {
    const contractInfo = req.body;
    const filePath = `./contracts/${contractInfo.title}Contract.sol`;

    fs.writeFileSync(filePath, templateContract(`${contractInfo.title}Contract`), "utf8");

    const source = fs.readFileSync(filePath, "utf8");
    console.log('transaction...compiling contract .....');
    
    const input = {
      language: 'Solidity',
      sources: {
        "deployContract": {
          content: source,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['*']
          }
        }
      }
    };


    const compiledContract = JSON.parse(solc.compile(JSON.stringify(input)));

    let bytecode = '';
    let abi = '';

    for(let contract in compiledContract.contracts['deployContract']){
      abi = compiledContract.contracts['deployContract'][contract]["abi"];
      bytecode = compiledContract.contracts['deployContract'][contract]["evm"]["bytecode"]["object"];
    }
    
    
    
    const MyContract = new singleWeb3.eth.Contract(abi);

    const deploy = MyContract.deploy({
                    data: "0x" + bytecode,
                    from: process.env.SEND_ACCOUNT
                  }).encodeABI();
    
    singleWeb3.eth.getTransactionCount(process.env.SEND_ACCOUNT, (err, txCount) => {
      
      
      const txObject = {
        nonce:    singleWeb3.utils.toHex(txCount),
        gasLimit: 4000000,
        gasPrice: singleWeb3.utils.toHex(singleWeb3.utils.toWei('10', 'gwei')),
        data : deploy
      };
      
      const common = new Common({chain:Chain.Sepolia, hardfork: Hardfork.London});
      const tx = Transaction.fromTxData(txObject, { common });
      //const tx = new Tx(txObject,{chain:Chain.Sepolia, hardfork:'petersburg'});
      
      const signedTx = tx.sign(privateKey);
 
      const serializedTx = signedTx.serialize();

      const raw = '0x' + serializedTx.toString('hex');
      
      singleWeb3.eth.sendSignedTransaction(raw)
        .once('transactionHash', (hash) => {
          console.info('transactionHash', process.env.BLOCK_CHAIN_HTTP_PROVIDER + hash);
        })
        .once('receipt', (receipt) => {
          console.info('receipt', receipt);
        }).on('error', console.error);
    });

    //fs.unlinkSync(filePath);
    return res.send(compiledContract); 

  } catch(e) {
    
    console.log(e);
  }

  
  
});

export default router;
