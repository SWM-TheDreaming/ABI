import express from "express";
import dotenv from "dotenv";
import moment from "moment-timezone";
moment.tz.setDefault("Asia/Seoul");
import { createRequire } from "module";

import sqlCon from "../db/sqlCon.js";

import Client from "../controllers/client.js";
import { makeGroupHashedID } from "../lib/hashing.js";
import { contractInit } from "../lib/funcs.js";

dotenv.config({ path: "../.env" });

const require = createRequire(import.meta.url);

const client = new Client(process.env.BLOCK_CHAIN_HTTP_PROVIDER);

const conn = sqlCon();
const router = express.Router();

/**
 * @Notice setStudyGroupContracts Send Router
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
router.post("/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;
    const body = req.body;
    const txHash = {};

    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title.replace(" ", "")
    );

    const txParams = {
      leaderId: body.leaderId,
      groupId: hashedGroupInfo.crypt,
      capacity: body.capacity,
      groupDepositPerPerson: body.groupDepositPerPerson,
      groupPeriod: body.groupPeriod,
      recruitmentPeriod: body.recruitmentPeriod,
      minimumAttendance: body.minimumAttendance,
      minimumMissionCompletion: body.minimumMissionCompletion,
    };

    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");

    try {
      const receipt = await deployedContract.methods
        .setStudyGroupContract(
          txParams.leaderId,
          txParams.groupId,
          txParams.capacity,
          txParams.groupDepositPerPerson,
          txParams.groupPeriod,
          txParams.recruitmentPeriod,
          txParams.minimumAttendance,
          txParams.minimumMissionCompletion
        )
        .send({
          from: process.env.SEND_ACCOUNT,
          gasLimit: block.gasLimit,
          gasPrice: client.web3.utils.toHex(
            client.web3.utils.toWei(gasPrice, "mwei") * 10
          ),
        })
        .once("transactionHash", async (hash) => {
          txHash.hash = hash;
          const nowTime = moment().format("YYYY-M-D H:m:s");
          await conn.execute("INSERT INTO contract_log VALUES (?,?,?,?)", [
            null,
            hashedGroupInfo.crypt,
            txHash.hash,
            nowTime,
          ]);
          console.log(hash);
        });

      return res.status(201).json({
        message: "컨트랙트 트렌젝션 발생을 성공시켰습니다.",
        result: {
          blockHash: receipt.blockHash,
          transactionHash: receipt.transactionHash,
          status: receipt.status,
        },
      });
    } catch (err) {
      console.log(err);
      return res.status(401).json({
        message: {
          transactionHash: txHash.hash,
          error_reason: err.reason,
        },
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message:
        "존재하지 않는 그룹의 스마트 컨트랙트 입니다. ID는 Long type 식별자를 썼는지, Title에 오타가 없는지 확인하세요.",
      error: error.message,
    });
  }
});

export default router;
