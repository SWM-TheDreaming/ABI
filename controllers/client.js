import Web3 from "web3";

let instance;
class Client {
  constructor(_url) {
    if (instance) return instance;
    this.web3 = new Web3(_url);
    const account = this.web3.eth.accounts.privateKeyToAccount(
      "0x" + process.env.SEND_ACCOUNT_PK
    );
    this.web3.eth.handleRevert = true;
    this.web3.eth.accounts.wallet.add(account);
    instance = this;
  }
}

export default Client;
