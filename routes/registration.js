import express from "express";
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
const router = express.Router();

const privateKey = Buffer.from(process.env.SEND_ACCOUNT_PK, "hex");

/**
 * @Notice Write Smart Contract and Deploy on Chain Network
 *
 * @Body
 *  group_id : Long group_id / 1
 *  title : String title
 *
 */
router.post("/", async function (req, res, next) {
  try {
    const contractInfo = req.body;

    const hashedGroupInfo = await makeGroupHashedID(
      contractInfo.group_id,
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
            client.web3.utils.toWei(gasPrice, "mwei") * 10
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
          const receipt = await client.web3.eth
            .sendSignedTransaction(raw)
            .once("transactionHash", (hash) => {
              txHash.hash = hash;
              console.info("transactionHash", hash);
            });

          const nowTime = moment().format("YYYY-M-D H:m:s");

          contractWriteResult.blockHash = receipt.blockHash;
          contractWriteResult.contractAddress = receipt.contractAddress;
          contractWriteResult.transactionHash = receipt.transactionHash;
          contractWriteResult.status = receipt.status;

          await conn.execute("INSERT INTO contracts VALUES (?,?,?,?,?)", [
            null,
            hashedGroupInfo.crypt,
            contractWriteResult.contractAddress,
            nowTime,
            nowTime,
          ]);

          await conn.execute("INSERT INTO contract_log VALUES (?,?,?,?)", [
            null,
            hashedGroupInfo.crypt,
            contractWriteResult.transactionHash,
            nowTime,
          ]);

          return res.status(201).json({
            message: "컨트랙트 생성에 성공했습니다.",
            contractWriteResult,
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
      }
    );
  } catch (err) {
    console.log(err);
    return res.status(401).json({
      message: "예상치 못한 에러가 발생했습니다.",
      error: err.message,
    });
  }
});

export default router;
