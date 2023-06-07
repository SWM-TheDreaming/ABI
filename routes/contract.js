import express from 'express';
import dotenv from 'dotenv';

import { Chain, Common, Hardfork } from '@ethereumjs/common';
import { Transaction } from '@ethereumjs/tx';

import sqlCon from '../db/sqlCon.js'

import Contract from '../controllers/compile.js';
import Client from '../controllers/client.js';



dotenv.config({ path: '../.env' });

// const singleWeb3 = new Web3(new Web3.providers.HttpProvider(process.env.BLOCK_CHAIN_HTTP_PROVIDER));

const client = new Client(process.env.BLOCK_CHAIN_HTTP_PROVIDER);
const conn = sqlCon();
const router = express.Router();

const privateKey = Buffer.from(process.env.SEND_ACCOUNT_PK,'hex');

/* GET home page. */
router.post('/write', async function(req, res, next) {
  try {
    const contractInfo = req.body;
    const contractTitle = contractInfo.title + "Contract";

    const contractWriteResult = {};


    const [abi, bytecode] = Contract.compile(contractTitle);

    console.log('transaction...compiling contract .....');
    
    const MyContract = new client.web3.eth.Contract(abi);

    const deploy = MyContract.deploy({
                    data: "0x" + bytecode,
                    from: process.env.SEND_ACCOUNT
                  }).encodeABI();
    
    client.web3.eth.getTransactionCount(process.env.SEND_ACCOUNT, (err, txCount) => {

      const txObject = {
        nonce:    client.web3.utils.toHex(txCount),
        gasLimit: 4000000,
        gasPrice: client.web3.utils.toHex(client.web3.utils.toWei('10', 'gwei')),
        data : deploy
      };
      
      const common = new Common({chain:Chain.Sepolia, hardfork: Hardfork.London});
      const tx = Transaction.fromTxData(txObject, { common });
      
      const signedTx = tx.sign(privateKey);
 
      const serializedTx = signedTx.serialize();

      const raw = '0x' + serializedTx.toString('hex');
      
      client.web3.eth.sendSignedTransaction(raw)
        .once('transactionHash', (hash) => {
          console.info('transactionHash', process.env.BLOCK_CHAIN_HTTP_PROVIDER +" / " + hash);
        })
        .once('receipt', (receipt) => {
          contractWriteResult.blockHash = receipt.blockHash;
          contractWriteResult.contractAddress = receipt.contractAddress;
          contractWriteResult.transactionHash = receipt.transactionHash;
          contractWriteResult.status = receipt.status;
          console.info('receipt', receipt);

          return res.status(201).json(
            {
              message : "컨트랙트 생성에 성공했습니다.",
              contractWriteResult
            }
          );
        }).on('error', (err) => {
          return res.status(401).json(
            {
              message : "컨트랙트 생성에 실패했습니다.",
              err
            }
          );
        });

        
    });


    
  } catch(e) {
    
    console.log(e);
  }

  
  
});

export default router;
