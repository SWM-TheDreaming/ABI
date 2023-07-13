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
 * @Notice putGroupStatusPendingToStart Call Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 */
router.get("/start/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;
    const txHash = {};

    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title.replace(" ", "")
    );
    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");

    try {
      const receipt = await deployedContract.methods
        .putGroupStatusPendingToStart()
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
          console.info("transactionHash", hash);
        });

      return res.status(201).json({
        message: "컨트랙트 작성에 성공했습니다.",

        result: {
          blockHash: receipt.blockHash,
          status: receipt.status,
          transactionHash: receipt.transactionHash,
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

/**
 * @Notice putGroupStatusStartToEnd Call Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 */
router.get("/end/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;
    const txHash = {};

    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title.replace(" ", "")
    );
    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");

    try {
      const receipt = await deployedContract.methods
        .putGroupStatusStartToEnd()
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
          console.info("transactionHash", hash);
        });

      return res.status(201).json({
        message: "컨트랙트 작성에 성공했습니다.",

        result: {
          blockHash: receipt.blockHash,
          status: receipt.status,
          transactionHash: receipt.transactionHash,
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

/**
 * @Notice putSettleDeposit Send Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 */
router.get("/settle-contract/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;
    const txHash = {};

    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title.replace(" ", "")
    );
    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");

    try {
      const receipt = await deployedContract.methods
        .putSettleDeposit()
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
          console.info("transactionHash", hash);
        });

      return res.status(201).json({
        message: "컨트랙트 작성에 성공했습니다.",
        result: {
          blockHash: receipt.blockHash,
          status: receipt.status,
          transactionHash: receipt.transactionHash,
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

/**
 * @Notice stopStudyGroupContract Call Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 *
 */
router.get("/stop/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;
    const txHash = {};

    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title.replace(" ", "")
    );
    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");

    try {
      const receipt = await deployedContract.methods
        .stopStudyGroupContract()
        .send({
          from: process.env.SEND_ACCOUNT,
          gasLimit: block.gasLimit,
          gasPrice: client.web3.utils.toHex(
            client.web3.utils.toWei(gasPrice, "mwei") * 100
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

      console.info(receipt);
      return res.status(201).json({
        message: "컨트랙트 쓰기에 성공했습니다.",
        result: {
          blockHash: receipt.blockHash,
          status: receipt.status,
          transactionHash: receipt.transactionHash,
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
    return res.status(400).json({
      message:
        "존재하지 않는 그룹의 스마트 컨트랙트 입니다. ID는 Long type 식별자를 썼는지, Title에 오타가 없는지 확인하세요.",
      error: error.message,
    });
  }
});

export default router;
