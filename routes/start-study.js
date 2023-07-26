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

import onChainContract from "../tasks/onChainContract.js";
import startContract from "../tasks/startContract.js";
import transactionContract from "../tasks/transactionContract.js";
import writePaymentOnContract from "../tasks/writePaymentOnContract.js";

dotenv.config({ path: "../.env" });

const client = new Client(process.env.BLOCK_CHAIN_HTTP_PROVIDER);

const conn = sqlCon();
const router = express.Router();

const privateKey = Buffer.from(process.env.SEND_ACCOUNT_PK, "hex");

router.post("/", async function (req, res, next) {
  const responseQueue = [];
  const tasks = [
    onChainContract,
    transactionContract,
    writePaymentOnContract,
    startContract,
  ];

  const finish = () => {
    while (true) {
      if (responseQueue.length == tasks.length) {
        break;
      }
    }
    return res.status(201).json({
      message:
        "카프카큐 달리면 성공 메시지랑 실패 메시지 나눠서 큐 분배해줘야 하는데 지금은 안할래",
      responseQueue,
    });
  };

  const iterator = async (idx) => {
    if (idx == tasks.length) {
      return finish();
    }
    const task = tasks[idx];
    const cb = (result) => {
      console.log(result);
      responseQueue.push(result);
      iterator(idx + 1);
    };
    const taskResult = await task(req, res, next, cb);
    console.log(taskResult);
  };

  try {
    iterator(0);
  } catch (err) {
    console.log(err);
    return res.status(401).json({
      message: "예상치 못한 에러가 발생했습니다.",
      error: err.message,
    });
  }
});

export default router;
