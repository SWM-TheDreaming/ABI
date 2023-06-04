import express from 'express';
import sqlCon from '../db/sqlCon.js'
const conn = sqlCon();
const router = express.Router();


/* GET home page. */
router.get('/', async function(req, res, next) {

  return res.send("Hello NodeJS!"); 
});

export default router;
