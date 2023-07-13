import solc from "solc";
import fs from "fs-extra";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import templateContract from "./contractWriter.js";

const __fileName = fileURLToPath(import.meta.url);
const __dirname = dirname(__fileName);

class Contract {
  static compile(_filename) {
    const contractPath = path.join(
      __dirname,
      "../contracts",
      _filename + ".sol"
    );

    fs.writeFileSync(contractPath, templateContract(), "utf8");

    const data = JSON.stringify({
      language: "Solidity",
      sources: {
        [_filename]: {
          content: fs.readFileSync(contractPath, "utf8"),
        },
      },
      settings: {
        outputSelection: {
          "*": {
            "*": ["*"],
          },
        },
      },
    });

    const compiled = JSON.parse(solc.compile(data));
    console.log(compiled);
    return Contract.writeOutput(compiled); // [abi, bytecode]
  }

  static writeOutput(_compiled) {
    for (const contractFileName in _compiled.contracts) {
      const [contractName] = contractFileName.split(".");
      const contract = _compiled.contracts[contractFileName]["suite_contract"];

      const abi = contract.abi;
      const bytecode = contract.evm.bytecode.object;

      const obj = {
        abi,
        bytecode,
      };

      const buildPath = path.join(
        __dirname,
        "../build",
        `${contractName}.json`
      );
      fs.outputJSONSync(buildPath, obj);

      return [abi, bytecode];
    }
  }
}

export default Contract;
