import Web3 from "web3";

let instance;
class Client {
    constructor(_url) {
        if (instance) return instance;
        this.web3 = new Web3(_url);
        instance = this;
    }
}
 
export default Client;