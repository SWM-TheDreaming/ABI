import express from 'express';
import dotenv from 'dotenv';
import moment from 'moment-timezone'
moment.tz.setDefault('Asia/Seoul');
import { createRequire } from "module";

import { Chain, Common, Hardfork } from '@ethereumjs/common';
import { Transaction } from '@ethereumjs/tx';

import sqlCon from '../db/sqlCon.js'

import Contract from '../controllers/compile.js';
import Client from '../controllers/client.js';
import { makeGroupHashedID } from '../lib/hashing.js';


dotenv.config({ path: '../.env' });

const require = createRequire(import.meta.url);

const client = new Client(process.env.BLOCK_CHAIN_HTTP_PROVIDER);

const conn = sqlCon();
const router = express.Router();

const privateKey = Buffer.from(process.env.SEND_ACCOUNT_PK,'hex');
const regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/g;

/**
 * @Notice Write Smart Contract and Deploy on Chain Network
 * 
 * @Body
 *  group_id : Long group_id / 1
 *  title : String title / not included !, @, # ... / testGorupName
 * 
*/
router.post('/write', async function(req, res, next) {
  try {

    const contractInfo = req.body;

    if (regExp.test(contractInfo.title)) {
      return res.status(401).json(
        {
          message : "그룹 텍스트에 특수문자가 있는 경우 컨트랙트를 생성할 수 없습니다",
        }
      );
    }
    
    const contractTitle = contractInfo.title + "Contract";
    const hashedGroupInfo = await makeGroupHashedID(contractInfo.group_id, contractInfo.title);
    const contractWriteResult = {};

    console.log('transaction...compiling contract .....');
    const [abi, bytecode] = Contract.compile(contractTitle);

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
          console.info('transactionHash', hash);
        })
        .once('receipt', async (receipt) => {
          const nowTime = moment().format("YYYY-M-D H:m:s");

          contractWriteResult.blockHash = receipt.blockHash;
          contractWriteResult.contractAddress = receipt.contractAddress;
          contractWriteResult.transactionHash = receipt.transactionHash;
          contractWriteResult.status = receipt.status;
          
          await conn.execute('INSERT INTO contracts VALUES (?,?,?,?,?,?,?)', [null, hashedGroupInfo.crypt, receipt.contractAddress, contractTitle,hashedGroupInfo.salt ,nowTime, nowTime]);
          await conn.execute('INSERT INTO contract_log VALUES (?,?,?,?)', [null, hashedGroupInfo.crypt, receipt.transactionHash, nowTime]);

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
    return res.status(401).json(
      {
        message : "예상치 못한 에러가 발생했습니다.",
        error : e
      }
    );
  }
});

/**
 * @Notice setStudyGroupContracts Call Router
 * 
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ... 
 * 
 * @body
 *  leaderId : String leaderId / admin
 *  capacity : Int capacity / 4
 *  groupDepositPerPerson : Int groupDepositPerPerson / 10000
 *  groupPeriod : Int groupPeriod / 30 (days)
 */
router.post('/:groupId/:title', async (req, res, next) => {
  try {

    const params = req.params;
    const body = req.body;

    if (regExp.test(params.title)) {
      return res.status(401).json(
        {
          message : "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
        }
      );
    }

    const hashedGroupInfo = await makeGroupHashedID(params.groupId, params.title);

    const groupCreateInfo = {

      leaderId : body.leaderId,
      groupId : hashedGroupInfo.crypt,
      capacity : body.capacity,
      groupDepositPerPerson : body.groupDepositPerPerson,
      groupPeriod : body.groupPeriod

    }
    
    const [contractInfo, ] = await conn.execute('select * from contracts where hashed_group_id = ?',[hashedGroupInfo.crypt]);
    const CA = contractInfo[0].contract_address;
    const encodedContract = require(`../build/${params.title}Contract.json`);
    
    const deployedContract = new client.web3.eth.Contract(encodedContract.abi, CA);
    
    deployedContract.methods
      .setStudyGroupContracts(
        groupCreateInfo.leaderId,
        groupCreateInfo.groupId,
        groupCreateInfo.capacity,
        groupCreateInfo.groupDepositPerPerson,
        groupCreateInfo.groupPeriod
      ).send({ 
        from : process.env.SEND_ACCOUNT,
        gas: 4000000
      })
      .on("receipt", (receipt) => {
        return res.status(201).json(
          {
            message : "컨트랙트 작성에 성공했습니다.",
            receipt
          }
        );
      });

    

  } catch (error) {
    console.log(error);
    return res.status(400).json(
      {
        message : "존재하지 않는 그룹의 스마트 컨트랙트 입니다. ID는 Long type 식별자를 썼는지, Title에 오타가 없는지 확인하세요.",
        error : error.message
      }
    );
  }
});

/**
 * @Notice callContractDetail Call Router
 * 
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ... 
 * 
 */
router.get('/callContract/:groupId/:title', async (req, res, next) => {
  try {
    
    const params = req.params;

    if (regExp.test(params.title)) {
      return res.status(401).json(
        {
          message : "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
        }
      );
    }

    const hashedGroupInfo = await makeGroupHashedID(params.groupId, params.title);
    
    const [contractInfo, ] = await conn.execute('select * from contracts where hashed_group_id = ?',[hashedGroupInfo.crypt]);
    const CA = contractInfo[0].contract_address;
    const encodedContract = require(`../build/${params.title}Contract.json`);
    
    const deployedContract = new client.web3.eth.Contract(encodedContract.abi, CA);
    deployedContract.methods.callContractDetail().call().then(res => console.info(res)).catch(err=>console.log(err));

    // deployedContract.methods
    //   .callContractDetail()
    //   .call({
    //     from : process.env.SEND_ACCOUNT,
    //     gas : 4000000
    //   })
    //   .then(result =>console.info(result))
    //   .catch(err => console.log(err));

    
    

    return res.status(201).json(
      {
        message : "컨트랙트 읽기에 성공했습니다.",
        hashedGroupInfo
      }
    );

  } catch (error) {
    console.log(error);
    return res.status(400).json(
      {
        message : "존재하지 않는 그룹의 스마트 컨트랙트 입니다. ID는 Long type 식별자를 썼는지, Title에 오타가 없는지 확인하세요.",
        error : error.message
      }
    );
  }
});


export default router;
