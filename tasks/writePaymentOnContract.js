import dotenv from "dotenv";
import moment from "moment-timezone";
moment.tz.setDefault("Asia/Seoul");

import sqlCon from "../db/sqlCon.js";

import Client from "../controllers/client.js";
import { makeGroupHashedID } from "../lib/hashing.js";
import { contractInit } from "../lib/funcs.js";

dotenv.config({ path: "../.env" });

const client = new Client(process.env.BLOCK_CHAIN_HTTP_PROVIDER);

const conn = sqlCon();
const writePaymentOnContract = async (req, res, next, cb) => {
  const contractInfo = req.body;
  try {
    const txHash = {};

    const hashedGroupInfo = await makeGroupHashedID(
      contractInfo.groupId,
      contractInfo.title.replace(" ", "")
    );

    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");

    const successQueue = [];
    const failQueue = [];

    for await (let depositPayer of contractInfo.depositPayers) {
      const txParams = {
        deposit_payer_id: depositPayer,
        group_id: hashedGroupInfo.crypt,
        deposit_amount: contractInfo.deposit_amount,
      };

      await deployedContract.methods
        .patchClientPaymentDeposit(
          txParams.deposit_payer_id,
          txParams.deposit_amount
        )
        .send({
          from: process.env.SEND_ACCOUNT,
          gasLimit: block.gasLimit,
          gasPrice: client.web3.utils.toHex(
            client.web3.utils.toWei(gasPrice, "wei") * process.env.WEI_WEIGHT
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
        })
        .once("receipt", (rpt) => {
          console.log(depositPayer + " is Success");
          successQueue.push({
            depositPayer,
            message: "컨트랙트 보증금 기입 트렌젝션 발생이 성공했습니다.",
          });
        })
        .once("error", (err, rpt) => {
          console.log(err);
          console.log(depositPayer + " is Fail");
          failQueue.push({
            depositPayer,
            fail_reason: {
              error: err.message,
            },
          });
        });
    }

    const result = {
      writePaymentOnContract_200: {
        message: "보증금 납부 성공자와 실패자 명단입니다.",
        successQueue,
        failQueue,
      },
    };

    cb(result);
    return "컨트랙트 보증금 기입 트렌젝션을 완료했습니다. responseQueue를 확인해주세요.";
  } catch (error) {
    console.log(error);

    const result = {
      writePaymentOnContract_err: {
        message:
          "존재하지 않는 그룹의 스마트 컨트랙트 입니다. ID는 Long type 식별자를 썼는지, Title에 오타가 없는지 확인하세요.",
        error: error.message,
        compensation_context: {
          contractInfo,
        },
      },
    };
    cb(result);
    return "컨트랙트 보증금 기입 트렌젝션을 실패했습니다. responseQueue를 확인해주세요.";
  }
};

export default writePaymentOnContract;
