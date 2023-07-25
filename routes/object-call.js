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

    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title.replace(" ", "")
    );
    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");
    try {
      const receipt = await deployedContract.methods.callContractDetail().call({
        from: process.env.SEND_ACCOUNT,
        gasLimit: block.gasLimit,
        gasPrice: client.web3.utils.toHex(
          client.web3.utils.toWei(gasPrice, "wei")
        ),
      });

      console.info(receipt);
      Object.keys(txResult).forEach((key) => {
        txResult[key] = receipt[key];
      });

      return res.status(201).json({
        message: "컨트랙트 읽기에 성공했습니다.",
        txResult,
      });
    } catch (err) {
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
 * @Notice callContractDepositDetail Call Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 *
 */
router.get("/group-deposit-detail/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;

    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title.replace(" ", "")
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
          deposit_amount: rec[1],
          payment_timestamp: rec[2],
          kicked_flag: rec[3],
        };
        txResult.push(tmp);
      });

      return res.status(201).json({
        message: "보증금 내역을 성공적으로 읽었습니다.",
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
 * @Notice callSuiteDepositDetail Call Router
 *
 * @Param groupId : Long group_id
 * @Param title : String title / Not included !,@,#, ...
 *
 */
router.get("/suite-deposit-detail/:groupId/:title", async (req, res, next) => {
  try {
    const params = req.params;

    const hashedGroupInfo = await makeGroupHashedID(
      params.groupId,
      params.title.replace(" ", "")
    );
    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");
    const receipt = await deployedContract.methods
      .callSuiteDepositDetail()
      .call({
        from: process.env.SEND_ACCOUNT,
        gasLimit: block.gasLimit,
        gasPrice: client.web3.utils.toHex(
          client.web3.utils.toWei(gasPrice, "mwei") * 10
        ),
      })
      .catch((err) => {
        return res.status(400).json({
          message: "컨트랙트 읽기에 실패했습니다.",
          error: err.message,
        });
      });
    console.info(receipt.deposit_balance);

    const txResult = [];
    receipt.suiteFinance.forEach((rec) => {
      const tmp = {
        group_id: rec[0],
        payer_id: rec[1],
        payed_reason: rec[2],
        payed_amount: rec[3],
        timestamp: rec[4],
      };
      txResult.push(tmp);
    });
    return res.status(201).json({
      message: "서비스가 가져갈 수 있는 최종 이윤에 대한 보증금액 장부를 반환합니다.",
      txResult,
      depositBalance: receipt.deposit_balance,
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

      const hashedGroupInfo = await makeGroupHashedID(
        params.groupId,
        params.title.replace(" ", "")
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
            deposit_amount: rec[1],
            payment_timestamp: rec[2],
            kicked_flag: rec[3],
          };
          txResult.push(tmp);
        });
        return res.status(201).json({
          message: "최종 보증금액 장부를 반환합니다.",
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
