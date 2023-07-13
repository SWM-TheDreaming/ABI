import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const createSalt = () =>
  new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err, buf) => {
      if (err) reject(err);
      resolve(buf.toString("base64"));
    });
  });

export const makeGroupHashedID = (group_plain_id, group_plain_title) =>
  new Promise(async (resolve, reject) => {
    const salt = process.env.SALT;
    crypto.pbkdf2(
      String(group_plain_id) + group_plain_title,
      salt,
      9999,
      32,
      "sha512",
      (err, key) => {
        if (err) reject(err);
        resolve({ crypt: key.toString("hex"), salt });
      }
    );
  });
