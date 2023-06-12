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
 * @Notice callContractDetail Call Router
 * 
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ... 
 * 
 */
router.get('/contract-detail/:groupId/:title', async (req, res, next) => {
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

    deployedContract.methods
      .callContractDetail()
      .call({
        from : process.env.SEND_ACCOUNT,
        gas : 4000000
      })
      .then((receipt) =>{
        const group_info = {};
        const cutOff = ['0','1','2','3','4','5'];
        for (let cts in receipt) {
          if (cts in cutOff) {
            continue
          }
          if (cts === "groupStatus") {
            if (receipt[cts] == "0") {
              group_info[cts] = "pending";
            } else if (receipt[cts] == "1") {
              group_info[cts] = "start";    
            } else {
              group_info[cts] = "end";
            }
          } else {
            group_info[cts] = receipt[cts];
          }
        }

        console.info(group_info);
        return res.status(201).json(
          {
            message : "컨트랙트 읽기에 성공했습니다.",
            group_info
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

/**
 * @Notice callContractDepositDetail Call Router
 * 
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ... 
 * 
 */
router.get('/group-deposit-detail/:groupId/:title', async (req, res, next) => {
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

    deployedContract.methods
      .callContractDepositDetail()
      .call({
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

/**
 * @Notice callDreamingDepositDetail Call Router
 * 
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ... 
 * 
 */
router.get('/dreaming-deposit-detail/:groupId/:title', async (req, res, next) => {
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

    deployedContract.methods
      .callDreamingDepositDetail()
      .call({
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

/**
 * @Notice callDreamingLog Call Router
 * 
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ... 
 * 
 */
router.get('/dreaming-log/:groupId/:title', async (req, res, next) => {
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

    deployedContract.methods
      .callDreamingLog()
      .call({
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
