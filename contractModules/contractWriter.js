const templateContract = (contractTitle) => {
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;



/**
* @title The dreaming despoit smart contract
* @author lopahn2 / hwany9181@gmail.com
* @notice Agent for deposit distributor
*/
contract ${contractTitle} {

    ///@notice When Contract be ended, ReadOnly
    bool isContractRun;
    
    ///@notice Response Msg for ABI server
    
    bytes32 response_success_msg = "200_OK";
    bytes32 response_post_success_msg = "201_OK";
    bytes32 response_fail_msg = "400_FAIL";

    ///@notice Dreaming deposit object for control
    DreamingDeposit dreamingDeposit;

    ///@notice Dreaming company wallet address identifier
    address _owner;

    constructor() {
        _owner = msg.sender;
        isContractRun = true;
    }

    /**
    * @notice Set status of group
    * @enum:pending -> recruit study group member status & not all payed group deposit
    * @enum:start -> study group start after checking all guests pay the deposit
    * @enum:end -> study group end when presetted time peroid over, in this status 
    *              study group guest and host can pay back their deposit
    */
    enum GroupStatus {
        pending,
        start,
        end
    }


    /**
    * @notice The Dreaming Finance Info 
    * @key:deposit_balance -> unit (원)
    * @key:dreamingFinance -> finance flow log when profit occured
    */
    struct DreamingDeposit {
        uint deposit_balance;
        DreamingFinance[] dreamingFinance;
    }
    
    struct DreamingFinance {
        string group_id;
        bytes32 payer_id;
        string payed_reason;
        uint payed_amount;
        uint timestamp;
    }
    


    /**
    * @notice Study group members' deposit payment struct
    * @key:deposit_amount -> unit (원)
    * @key:payment_timestamp -> unit(unix time)
    */
    struct Deposit {
        bytes32 deposit_payer_id;
        string warranty_pledge;
        uint deposit_amount;
        uint payment_timestamp;
    }

    /**
    * @notice Study group contract details
    * @key:group_capacity -> unit (명)
    * @key:group_deposit_per_person -> unit (원)
    * @key:group_period -> unit (unix time)
    * @enum:GroupStatus
    * @key:midterm_refund_amount 
    *       @midterm_refund_flag:true -> presetting when ABI Server send contract detail
    *       @else -> same as group_deposit_per_person
    */
    struct GroupContract {
        bytes32 leader_id;
        string group_id;
        uint group_capacity; 
        uint group_deposit_per_person; 
        uint group_deadline;
        GroupStatus groupStatus;
        bool midterm_refund_flag;
        uint midterm_refund_amount;
    }

    ///@notice Study Group Contract object for control
    GroupContract groupContract;
    
    /**
    * @notice Study groups Deposits Finance Info are handled by studyGroupDeposits Array
    */
    Deposit[] studyGroupDeposits;
    

    ///@notice Check function caller is admin of the dreaming
    modifier onlyOwner() {
        require(msg.sender == _owner, "The caller is not owner.");
        _;
    }

    ///@notice Check function Contract is readOnly Status or Not
    modifier isRun() {
        require(isContractRun == true, "The Contract is end. Read Only");
        _;
    }

    /**
    * @notice Study group's initial contract create request handler
    * @param midterm_refund_flag : Midterm return possible flag for setting midterm_refund_amount
    * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
    */
    function setStudyGroupContracts(
        bytes32 leader_id,
        string memory group_id,
        uint group_capacity,
        uint group_deposit_per_person,
        uint group_period,
        bool midterm_refund_flag,
        uint midterm_refund_amount
    ) isRun onlyOwner public returns(bytes32) {
        uint refundAmount = 0;
        if (midterm_refund_flag) {
            refundAmount = midterm_refund_amount;
        } else {
            refundAmount = group_deposit_per_person;
        }
        groupContract = GroupContract(
            leader_id, group_id, group_capacity, group_deposit_per_person, (block.timestamp + group_period * 1 days), GroupStatus(0), midterm_refund_flag, refundAmount
        );
        
        return(response_post_success_msg);
        
    }


    /**
    * @notice Check if the points the client wants to pay are equal to the preset deposit
    * @param client_payment : Points paid by the client
    * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
    */
    function callCheckGroupDeposit(
        uint client_payment
    ) public view returns(bytes32) {
        if (groupContract.group_deposit_per_person == client_payment) {
            return(response_success_msg);
        } else {
            return(response_fail_msg);
        }
    }

    /**
    * @notice Check whether the user has paid
    * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
    */
    function callCheckClientPaymentComplition(
        bytes32 deposit_payer_id
    ) isRun public view returns(bytes32) {
        require(studyGroupDeposits.length != 0, "No one pay the deposit");
        for (uint i; i < studyGroupDeposits.length; i++) {
            if(studyGroupDeposits[i].deposit_payer_id == deposit_payer_id) {
                if (studyGroupDeposits[i].deposit_amount == groupContract.group_deposit_per_person) {
                    return(response_success_msg);
                }
            }
        }
        return(response_fail_msg);
    }

    /**
    * @notice Calling the study group's deposit accounting details
    * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
    */
    function callContractDepositDetail() public view returns(Deposit[] memory) {
        return(studyGroupDeposits);
    }

    /**
    * @notice Calling the Dreaming's deposit accounting details
    * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
    */
    function callDreamingDepositDetail() onlyOwner public view returns(DreamingDeposit memory) {
        return dreamingDeposit;
    }


    /**
    * @notice Request to add the deposit amount to the deposit according to the contract 
    *         Change status if paid in full
    * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
    */
    function patchClientPaymentDeposit(
        bytes32 deposit_payer_id,
        string memory warrenty_pledge,
        uint deposit_amount
    ) isRun onlyOwner public returns(GroupStatus, bytes32) {
        studyGroupDeposits.push(Deposit(
            deposit_payer_id,
            warrenty_pledge,
            deposit_amount,
            block.timestamp
        ));

        if (studyGroupDeposits.length == groupContract.group_capacity) {
            groupContract.groupStatus = GroupStatus(1);
        }

        return(groupContract.groupStatus, response_post_success_msg);

    }   

    /**
    * @notice Split the deposit of the kicked user equally among the rest and Dreaming
    *         
    * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
    */
    function patchDistributeKickedClientDeposit(
        bytes32 deposit_payer_id
    ) isRun onlyOwner public returns(bytes32) {
        uint returnableDepositAmount = 0;

        for (uint i = 0; i < studyGroupDeposits.length; i++) {
            if(studyGroupDeposits[i].deposit_payer_id == deposit_payer_id) {
                returnableDepositAmount += studyGroupDeposits[i].deposit_amount;
                studyGroupDeposits[i].deposit_amount = 0;
                break;
            }
        }

        /// @dev split equally among the rest and Dreaming. Because Solidity can not handle float type
        returnableDepositAmount /= studyGroupDeposits.length;
        dreamingDeposit.deposit_balance += returnableDepositAmount;

        dreamingDeposit.dreamingFinance.push(DreamingFinance(groupContract.group_id, deposit_payer_id, "Kick of player", returnableDepositAmount, block.timestamp));

        for (uint i = 0; i < studyGroupDeposits.length; i++) {
            if(studyGroupDeposits[i].deposit_payer_id != deposit_payer_id) {
                studyGroupDeposits[i].deposit_amount += returnableDepositAmount;
            }
        }

        return(response_post_success_msg);

    }

    /**
    * @notice Forfeiture of deposit due to breach of contract
    *         
    * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
    */
    function patchAttributeAllDepositsToDreaming() isRun onlyOwner private returns(bytes32) {
        uint returnableDepositAmount = 0;

        for (uint i = 0; i < studyGroupDeposits.length; i++) {
            returnableDepositAmount += studyGroupDeposits[i].deposit_amount;
            studyGroupDeposits[i].deposit_amount = 0;
        }

        dreamingDeposit.deposit_balance += returnableDepositAmount;
        dreamingDeposit.dreamingFinance.push(DreamingFinance(groupContract.group_id, "All Payed", "Boom Study Group ( breach of contract )", returnableDepositAmount, block.timestamp));

        return(response_post_success_msg);
    }

    // 회사측 수익 구조 설계 후 다시 작성하기
    // 안할 것 같음
    function patchDistributeMidtermClientDeposit() isRun onlyOwner private returns(bytes32) {}


    /**
    * @notice Status change request after checking group termination conditions
    * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
    */
    function putGroupStatusStartToEnd() isRun public returns(GroupStatus, bytes32, GroupContract memory) {
        uint nowUnixTime = block.timestamp;
        require(nowUnixTime >= groupContract.group_deadline, "Study is not finished");
        require(groupContract.groupStatus != GroupStatus(2), "Study is already ended");
        
        groupContract.groupStatus = GroupStatus(2);

        return(
            groupContract.groupStatus,
            response_post_success_msg,
            groupContract
        );
    }

    /**
    * @notice Return Dreaming Revenue when Study is end and is not stop.
    *         Also Balance is not zero.
    * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
    */
    function putDreamingReturnAllDeposit() isRun onlyOwner public returns(uint) {
        require(dreamingDeposit.deposit_balance != 0, "Dreaming Deposit Balance is 0");
        
        uint revenueOfDreamingInThisContract = dreamingDeposit.deposit_balance;
        
        dreamingDeposit.deposit_balance = 0;

        return revenueOfDreamingInThisContract;
    }

    /**
    * @notice Study group stop request (when group_status is pending or end)
    * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
    */
    function stopStudyGroupContract() isRun public returns(bytes32) {
        GroupStatus groupStatus = groupContract.groupStatus;
        require(groupStatus != GroupStatus(1), "Study is running now");
        require(dreamingDeposit.deposit_balance == 0, "Dreaming Deposit is not payed to Dreaming");
        isContractRun = false;
        return(response_post_success_msg);
    }    
    
        
}
  `
}

export default templateContract;