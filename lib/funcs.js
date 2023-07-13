import { makeGroupHashedID } from "./hashing.js";
import sqlCon from "../db/sqlCon.js";
const conn = sqlCon();
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const contractInit = async (hashedGroupInfo, client) => {
  const [contractInfo] = await conn.execute(
    "select * from contracts where hashed_group_id = ?",
    [hashedGroupInfo.crypt]
  );

  const CA = contractInfo[0].contract_address;
  console.log(contractInfo[0]);
  const encodedContract = require(`../build/${contractInfo[0].hashed_group_id}.json`);

  const deployedContract = new client.web3.eth.Contract(
    encodedContract.abi,
    CA
  );

  return deployedContract;
};

export { contractInit };
