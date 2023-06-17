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

const regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/g;

/**
 * @Notice patchClientPaymentDeposit Send Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 *
 * @body
 *  deposit_payer_id : String deposit_payer_id
 *  warrenty_pledge : String warrenty_pledge / Can be depreciated
 *  deposit_amount : Int deposit_amount
 *
 * @Dev
 *  Contract need group_id for transaction. (hash params for group_id in here)
 */
router.post("/client-payment/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;
    const body = req.body;
    const txHash = {};

    if (regExp.test(params.title)) {
      return res.status(401).json({
        message: "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
      });
    }

    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title
    );

    const txParams = {
      deposit_payer_id: body.deposit_payer_id,
      warrenty_pledge: body.warrenty_pledge,
      group_id: hashedGroupInfo.crypt,
      deposit_amount: body.deposit_amount,
    };

    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");

    try {
      const receipt = await deployedContract.methods
        .patchClientPaymentDeposit(
          txParams.deposit_payer_id,
          txParams.warrenty_pledge,
          txParams.group_id,
          txParams.deposit_amount
        )
        .send({
          from: process.env.SEND_ACCOUNT,
          gasLimit: block.gasLimit,
          gasPrice: client.web3.utils.toHex(
            client.web3.utils.toWei(gasPrice, "mwei")
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
          message:
            "block explore site에서 transactionHash 값을 복사해 TX 결과를 확인하세요.",
          "block explore site": "https://sepolia.etherscan.io/",
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
 * @Notice patchDistributeKickedClientDeposit Send Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 *
 * @body
 *  deposit_payer_id : String deposit_payer_id
 *
 * @Dev
 *  Contract need group_id for transaction. (hash params for group_id in here)
 */
router.post("/kick-client/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;
    const body = req.body;
    const txHash = {};
    if (regExp.test(params.title)) {
      return res.status(401).json({
        message: "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
      });
    }

    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title
    );

    const txParams = {
      deposit_payer_id: body.deposit_payer_id,
      group_id: hashedGroupInfo.crypt,
    };

    const deployedContract = await contractInit(hashedGroupInfo, client);
    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");

    try {
      const receipt = await deployedContract.methods
        .patchDistributeKickedClientDeposit(
          txParams.deposit_payer_id,
          txParams.group_id
        )
        .send({
          from: process.env.SEND_ACCOUNT,
          gasLimit: block.gasLimit,
          gasPrice: client.web3.utils.toHex(
            client.web3.utils.toWei(gasPrice, "mwei")
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
          message:
            "block explore site에서 transactionHash 값을 복사해 TX 결과를 확인하세요.",
          "block explore site": "https://sepolia.etherscan.io/",
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
 * @Notice patchAttributeAllDepositsToDreaming Send Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 *
 *
 * @Dev
 *  Contract need group_id for transaction. (hash params for group_id in here)
 */
router.get("/attribute-client/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;
    const txHash = {};
    if (regExp.test(params.title)) {
      return res.status(401).json({
        message: "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
      });
    }

    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title
    );

    const txParams = {
      group_id: hashedGroupInfo.crypt,
    };

    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");

    try {
      const receipt = await deployedContract.methods
        .patchAttributeAllDepositsToDreaming(txParams.group_id)
        .send({
          from: process.env.SEND_ACCOUNT,
          gasLimit: block.gasLimit,
          gasPrice: client.web3.utils.toHex(
            client.web3.utils.toWei(gasPrice, "mwei")
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
        receipt,
        // result: {
        //   "blockHash": receipt.blockHash,
        //   "status": receipt.status,
        //   "transactionHash": receipt.transactionHash
        // }
      });
    } catch (err) {
      console.log(err);
      return res.status(401).json({
        message: {
          message:
            "block explore site에서 transactionHash 값을 복사해 TX 결과를 확인하세요.",
          "block explore site": "https://sepolia.etherscan.io/",
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
