import express from "express";
import dotenv from "dotenv";
import moment from "moment-timezone";
moment.tz.setDefault("Asia/Seoul");
import { createRequire } from "module";

import sqlCon from "../db/sqlCon.js";

import Client from "../controllers/client.js";
import { makeGroupHashedID } from "../lib/hashing.js";
import { contractInit } from "../lib/funcs.js";
import { hash } from "bcrypt";

dotenv.config({ path: "../.env" });

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
router.get("/contract-detail/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;

    const txResult = {
      leader_id: "",
      group_id: "",
      group_capacity: "",
      group_deposit_per_person: "",
      group_deadline: "",
      recruitment_period: "",
      minimum_attendance: "",
      minimum_mission_completion: "",
      groupStatus: "",
    };

    if (regExp.test(params.title)) {
      return res.status(401).json({
        message: "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
      });
    }
    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title
    );
    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");

    const receipt = await deployedContract.methods
      .callContractDetail()
      .call({
        from: process.env.SEND_ACCOUNT,
        gasLimit: block.gasLimit,
        gasPrice: client.web3.utils.toHex(
          client.web3.utils.toWei(gasPrice, "mwei")
        ),
      })
      .catch((err) => {
        return res.status(400).json({
          message: "컨트랙트 읽기에 실패했습니다.",
          error: err.message,
        });
      });
    console.info(receipt);
    Object.keys(txResult).forEach((key) => {
      txResult[key] = receipt[key];
    });

    return res.status(201).json({
      message: "컨트랙트 읽기에 성공했습니다.",
      txResult,
    });
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
 * @Notice callContractDepositDetail Call Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 *
 */
router.get("/group-deposit-detail/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;

    if (regExp.test(params.title)) {
      return res.status(401).json({
        message: "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
      });
    }
    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title
    );
    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");

    try {
      const receipt = await deployedContract.methods
        .callContractDepositDetail()
        .call({
          from: process.env.SEND_ACCOUNT,
          gasLimit: block.gasLimit,
          gasPrice: client.web3.utils.toHex(
            client.web3.utils.toWei(gasPrice, "mwei")
          ),
        });

      console.info(receipt);
      const txResult = [];
      receipt.forEach((rec) => {
        const tmp = {
          deposit_payer_id: rec[0],
          warranty_pledge: rec[1],
          deposit_amount: rec[2],
          payment_timestamp: rec[3],
          kicked_flag: rec[4],
        };
        txResult.push(tmp);
      });
      return res.status(201).json({
        message: "컨트랙트 읽기에 성공했습니다.",
        txResult,
      });
    } catch (err) {
      console.log(err);
      return res.status(400).json({
        message: "컨트랙트 읽기에 실패했습니다.",
        error: err.message,
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
 * @Notice callDreamingDepositDetail Call Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 *
 */
router.get(
  "/dreaming-deposit-detail/:groupId/:title",
  async (req, res, next) => {
    try {
      const params = req.params;

      if (regExp.test(params.title)) {
        return res.status(401).json({
          message: "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
        });
      }
      const hashedGroupInfo = await makeGroupHashedID(
        params.groupId,
        params.title
      );
      const deployedContract = await contractInit(hashedGroupInfo, client);

      const gasPrice = await client.web3.eth.getGasPrice();
      const block = await client.web3.eth.getBlock("latest");
      const receipt = await deployedContract.methods
        .callDreamingDepositDetail()
        .call({
          from: process.env.SEND_ACCOUNT,
          gasLimit: block.gasLimit,
          gasPrice: client.web3.utils.toHex(
            client.web3.utils.toWei(gasPrice, "mwei")
          ),
        })
        .catch((err) => {
          return res.status(400).json({
            message: "컨트랙트 읽기에 실패했습니다.",
            error: err.message,
          });
        });
      console.info(receipt);
      return res.status(201).json({
        message: "컨트랙트 읽기에 성공했습니다.",
        receipt,
        // result: {
        //   "blockHash": receipt.blockHash,
        //   "status": receipt.status,
        //   "transactionHash": receipt.transactionHash
        // }
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        message:
          "존재하지 않는 그룹의 스마트 컨트랙트 입니다. ID는 Long type 식별자를 썼는지, Title에 오타가 없는지 확인하세요.",
        error: error.message,
      });
    }
  }
);

/**
 * @Notice callDreamingLog Call Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 *
 */
router.get("/dreaming-log/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;

    if (regExp.test(params.title)) {
      return res.status(401).json({
        message: "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
      });
    }
    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title
    );
    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");
    const receipt = await deployedContract.methods
      .callDreamingLog()
      .call({
        from: process.env.SEND_ACCOUNT,
        gasLimit: block.gasLimit,
        gasPrice: client.web3.utils.toHex(
          client.web3.utils.toWei(gasPrice, "mwei")
        ),
      })
      .catch((err) => {
        return res.status(400).json({
          message: "컨트랙트 읽기에 실패했습니다.",
          error: err.message,
        });
      });
    console.log(receipt);
    const txResult = [];
    receipt.forEach((rec) => {
      const tmp = {
        who: rec[0],
        timestamp: rec[1],
        where: rec[2],
        amount: rec[3],
        from: rec[4],
        to: rec[5],
        why: rec[6],
      };
      txResult.push(tmp);
    });
    return res.status(201).json({
      message: "컨트랙트 읽기에 성공했습니다.",
      txResult,
    });
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
 * @Notice callFinalStudyGroupDeposits Call Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 *
 */
router.get(
  "/group-final-balance-detail/:groupId/:title",
  async (req, res, next) => {
    try {
      const params = req.params;

      if (regExp.test(params.title)) {
        return res.status(401).json({
          message: "그룹 텍스트에 특수문자가 있는 경우는 없습니다.",
        });
      }
      const hashedGroupInfo = await makeGroupHashedID(
        params.groupId,
        params.title
      );
      const deployedContract = await contractInit(hashedGroupInfo, client);

      const gasPrice = await client.web3.eth.getGasPrice();
      const block = await client.web3.eth.getBlock("latest");

      try {
        const receipt = await deployedContract.methods
          .callFinalStudyGroupDeposits()
          .call({
            from: process.env.SEND_ACCOUNT,
            gasLimit: block.gasLimit,
            gasPrice: client.web3.utils.toHex(
              client.web3.utils.toWei(gasPrice, "mwei")
            ),
          });

        console.info(receipt);
        const txResult = [];
        receipt.forEach((rec) => {
          const tmp = {
            deposit_payer_id: rec[0],
            warranty_pledge: rec[1],
            deposit_amount: rec[2],
            payment_timestamp: rec[3],
            kicked_flag: rec[4],
          };
          txResult.push(tmp);
        });
        return res.status(201).json({
          message: "컨트랙트 읽기에 성공했습니다.",
          txResult,
        });
      } catch (err) {
        console.log(err);
        return res.status(400).json({
          message: "컨트랙트 읽기에 실패했습니다.",
          error: err.message,
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
  }
);
export default router;
