import dotenv from "dotenv";
import moment from "moment-timezone";
moment.tz.setDefault("Asia/Seoul");

import { Chain, Common, Hardfork } from "@ethereumjs/common";
import { Transaction } from "@ethereumjs/tx";

import sqlCon from "../db/sqlCon.js";

import Contract from "../controllers/compile.js";
import Client from "../controllers/client.js";
import { makeGroupHashedID } from "../lib/hashing.js";

dotenv.config({ path: "../.env" });

const client = new Client(process.env.BLOCK_CHAIN_HTTP_PROVIDER);

const conn = sqlCon();

const privateKey = Buffer.from(process.env.SEND_ACCOUNT_PK, "hex");

const onChainContract = async (req, res, next, cb) => {
  const contractInfo = req.body;
  try {
    const hashedGroupInfo = await makeGroupHashedID(
      contractInfo.groupId,
      contractInfo.title.replace(" ", "")
    );

    const contractWriteResult = {};
    const txHash = {};

    console.log("transaction...compiling contract .....");
    const [abi, bytecode] = Contract.compile(hashedGroupInfo.crypt);

    const MyContract = new client.web3.eth.Contract(abi);

    const deploy = MyContract.deploy({
      data: "0x" + bytecode,
      from: process.env.SEND_ACCOUNT,
    }).encodeABI();

    client.web3.eth.getTransactionCount(
      process.env.SEND_ACCOUNT,
      async (err, txCount) => {
        const gasPrice = await client.web3.eth.getGasPrice();
        const block = await client.web3.eth.getBlock("latest");

        const txObject = {
          nonce: client.web3.utils.toHex(txCount),
          gasLimit: block.gasLimit,
          gasPrice: client.web3.utils.toHex(
            client.web3.utils.toWei(gasPrice, "wei") * process.env.WEI_WEIGHT
          ),
          data: deploy,
        };

        const common = new Common({
          chain: Chain.Sepolia,
          hardfork: Hardfork.London,
        });
        const tx = Transaction.fromTxData(txObject, { common });

        const signedTx = tx.sign(privateKey);

        const serializedTx = signedTx.serialize();

        const raw = "0x" + serializedTx.toString("hex");

        try {
          await client.web3.eth
            .sendSignedTransaction(raw)
            .once("transactionHash", (hash) => {
              txHash.hash = hash;
              console.info("transactionHash", hash);
            })
            .once("receipt", async (rpt) => {
              if (rpt.status) {
                const nowTime = moment().format("YYYY-M-D H:m:s");

                contractWriteResult.blockHash = rpt.blockHash;
                contractWriteResult.contractAddress = rpt.contractAddress;
                contractWriteResult.transactionHash = rpt.transactionHash;
                contractWriteResult.status = rpt.status;

                await conn.execute("INSERT INTO contracts VALUES (?,?,?,?,?)", [
                  null,
                  hashedGroupInfo.crypt,
                  contractWriteResult.contractAddress,
                  nowTime,
                  nowTime,
                ]);

                await conn.execute(
                  "INSERT INTO contract_log VALUES (?,?,?,?)",
                  [
                    null,
                    hashedGroupInfo.crypt,
                    contractWriteResult.transactionHash,
                    nowTime,
                  ]
                );

                const result = {
                  onChainContract_200: {
                    message: "컨트랙트 온체인에 성공했습니다.",
                    contractWriteResult,
                  },
                };
                cb(result);
              }
            });
        } catch (err) {
          console.log(err);

          const result = {
            onChainContract_err: {
              error: err.message,
              compensation_context: {
                contractInfo,
              },
            },
          };
          cb(result);
          return "컨트랙트 온체인에 실패했습니다. responseQueue를 확인해주세요";
        }
      }
    );

    return "컨트랙트 온체인이 진행중입니다.";
  } catch (err) {
    console.log(err);
    const result = {
      onChainContract_err: {
        error: err.message,
        compensation_context: {
          contractInfo,
        },
      },
    };
    cb(result);
    return "컨트랙트 온체인에 실패했습니다. responseQueue를 확인해주세요";
  }
};

export default onChainContract;
