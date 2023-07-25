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
const transactionContract = async (req, res, next, cb) => {
  const contractInfo = req.body;
  try {
    const txHash = {};

    const hashedGroupInfo = await makeGroupHashedID(
      contractInfo.groupId,
      contractInfo.title.replace(" ", "")
    );

    const txParams = {
      leaderId: contractInfo.leaderId,
      groupId: hashedGroupInfo.crypt,
      capacity: contractInfo.capacity,
      groupDepositPerPerson: contractInfo.groupDepositPerPerson,
      groupPeriod: contractInfo.groupPeriod,
      recruitmentPeriod: contractInfo.recruitmentPeriod,
      minimumAttendance: contractInfo.minimumAttendance,
      minimumMissionCompletion: contractInfo.minimumMissionCompletion,
    };

    const deployedContract = await contractInit(hashedGroupInfo, client);

    const gasPrice = await client.web3.eth.getGasPrice();
    const block = await client.web3.eth.getBlock("latest");

    await deployedContract.methods
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
        console.log(hash);
      })
      .once("receipt", (rpt) => {
        if (rpt.status) {
          const result = {
            transactionContract_200: {
              message: "컨트랙트 작성을 성공적으로 끝마쳤습니다.",
              result: {
                blockHash: rpt.blockHash,
                status: rpt.status,
                transactionHash: rpt.transactionHash,
              },
            },
          };
          cb(result);
        }
      })
      .once("error", (error, rpt) => {
        console.log(error);

        const result = {
          transactionContract_err: {
            message:
              "컨트랙트 작성에 에러가 발생했습니다. responseQueue를 확인하세요.",
            error: error.message,
            compensation_context: {
              contractInfo,
            },
          },
        };
        cb(result);
      });

    return "컨트랙트 작성이 진행중입니다.";
  } catch (error) {
    console.log(error);

    const result = {
      transactionContract_err: {
        message:
          "존재하지 않는 그룹의 스마트 컨트랙트 입니다. ID는 Long type 식별자를 썼는지, Title에 오타가 없는지 확인하세요.",
        error: error.message,
        compensation_context: {
          contractInfo,
        },
      },
    };
    cb(result);
    return "컨트랙트 작성에 실패했습니다. responseQueue를 확인해주세요";
  }
};

export default transactionContract;
