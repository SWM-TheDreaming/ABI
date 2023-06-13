import express from 'express';
import dotenv from 'dotenv';
import moment from 'moment-timezone'
moment.tz.setDefault('Asia/Seoul');
import { createRequire } from "module";

import sqlCon from '../db/sqlCon.js'

import Client from '../controllers/client.js';
import { makeGroupHashedID } from '../lib/hashing.js';
import { contractInit } from '../lib/funcs.js';

dotenv.config({ path: '../.env' });

const require = createRequire(import.meta.url);

const client = new Client(process.env.BLOCK_CHAIN_HTTP_PROVIDER);

const conn = sqlCon();
const router = express.Router();

const regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/g;

/**
 * @Notice putGroupStatusStartToEnd Call Router
 * 
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ... 
 */
router.get('/end/:groupId/:title', async (req, res, next) => {
  try {

    const params = req.params;

    if (regExp.test(params.title)) {
      return res.status(401).json(
        {
          message : "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
        }
      );
    }
    
    const deployedContract = await contractInit(params.groupId, params.title, client);
    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");
    deployedContract.methods
      .putGroupStatusStartToEnd()
			.call({
        from : process.env.SEND_ACCOUNT,
        gasLimit: block.gasLimit,
        gasPrice:client.web3.utils.toHex(parseInt(gasPrice * 10))
      }).once('transactionHash', (hash) => {
        console.info('transactionHash', hash);
      }).once("receipt", (receipt) => {
        return res.status(201).json(
          {
            message : "컨트랙트 작성에 성공했습니다.",
            receipt
            // result: {
            //   "blockHash": receipt.blockHash,
            //   "status": receipt.status,
            //   "transactionHash": receipt.transactionHash
            // }
          }
        );
      }).on('error', (err) => {
        console.log(err);
        return res.status(401).json(
          {
            message : "컨트랙트 생성에 실패했습니다.",
            error : err.message
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
 * @Notice putDreamingReturnAllDeposit Call Router
 * 
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ... 
 * 
 * @Dev This router make Dreaming revenue 0 and return the amount of revenue. Be careful when using
 */
router.get('/dreaming-revenue/:groupId/:title', async (req, res, next) => {
  try {

    const params = req.params;

    if (regExp.test(params.title)) {
      return res.status(401).json(
        {
          message : "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
        }
      );
    }
    
    const deployedContract = await contractInit(params.groupId, params.title, client);
    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");
    deployedContract.methods
      .putDreamingReturnAllDeposit()
			.call({
        from : process.env.SEND_ACCOUNT,
        gasLimit: block.gasLimit,
        gasPrice:client.web3.utils.toHex(parseInt(gasPrice * 10))
      }).once('transactionHash', (hash) => {
        console.info('transactionHash', hash);
      }).once("receipt", (receipt) => {
        return res.status(201).json(
          {
            message : "컨트랙트 작성에 성공했습니다.",
            receipt
            // result: {
            //   "blockHash": receipt.blockHash,
            //   "status": receipt.status,
            //   "transactionHash": receipt.transactionHash
            // }
          }
        );
      }).on('error', (err) => {
        console.log(err);
        return res.status(401).json(
          {
            message : "컨트랙트 생성에 실패했습니다.",
            error : err.message
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
 * @Notice stopStudyGroupContract Call Router
 * 
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ... 
 * 
 */
router.get('/stop/:groupId/:title', async (req, res, next) => {
  try {

    const params = req.params;

    if (regExp.test(params.title)) {
      return res.status(401).json(
        {
          message : "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
        }
      );
    }
    
    const deployedContract = await contractInit(params.groupId, params.title, client);
    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");
    deployedContract.methods
      .stopStudyGroupContract()
			.call({
        from : process.env.SEND_ACCOUNT,
        gasLimit: block.gasLimit,
        gasPrice:client.web3.utils.toHex(parseInt(gasPrice * 10))
      }).then((receipt) => {
        
        return res.status(201).json(
          {
            message : "컨트랙트 작성에 성공했습니다.",
            receipt
          }
        );
        
      }).catch((err) => {
        console.log(err);
      })
      
      
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
