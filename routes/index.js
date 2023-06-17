import express from "express";
import sqlCon from "../db/sqlCon.js";

const conn = sqlCon();
const router = express.Router();

/* GET home page. */
router.get("/", async function (req, res, next) {
  conn.execute("select * from contracts");
  return res.send("Hello NodeJS!");
});

export default router;
