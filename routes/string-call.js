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
 * @Notice callCheckClientPaymentComplition Send Router
 * 
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ... 
 * 
 * @Body deposit_payer_id : String deposit_payer_id
 */
router.post('/client-payment/:groupId/:title', async (req, res, next) => {
  try {
    const body = req.body;
    const params = req.params;

    if (regExp.test(params.title)) {
      return res.status(401).json(
        {
          message : "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
        }
      );
    }

    const deployedContract = await contractInit(params.groupId, params.title, client);

		const txParams = {
			deposit_payer_id : body.deposit_payer_id
    }

    deployedContract.methods
      .callCheckClientPaymentComplition(
				txParams.deposit_payer_id	
			)
      .send({
        from : process.env.SEND_ACCOUNT,
        gas : 4000000
      })
      .then((receipt) =>{
        
        return res.status(201).json(
          {
            message : "컨트랙트 읽기에 성공했습니다.",
            receipt
          }
        );
      })
      .catch((err) => {
        console.log(err);
        return res.status(400).json(
          {
            message : "컨트랙트 읽기에 실패했습니다.",
            err : err.message
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


export default router;
