import { makeGroupHashedID } from "./hashing.js";
import sqlCon from '../db/sqlCon.js'
const conn = sqlCon();
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const contractInit = async (groupId, title, client) => {
	const hashedGroupInfo = await makeGroupHashedID(groupId, title);
    
	const [contractInfo, ] = await conn.execute('select * from contracts where hashed_group_id = ?',[hashedGroupInfo.crypt]);
	const CA = contractInfo[0].contract_address;
	const encodedContract = require(`../build/${title}Contract.json`);
	
	const deployedContract = new client.web3.eth.Contract(encodedContract.abi, CA);
	
	return deployedContract
}

export { contractInit };