// SPDX-License-Identifier: MIT
  pragma solidity ^0.8.19;
  
  
  
  /**
  * @title The dreaming despoit smart contract
  * @author lopahn2 / hwany9181@gmail.com
  * @notice Agent for deposit distributor
  */
  contract adminContract {
  
      ///@notice When Contract be ended, ReadOnly
      bool isContractRun;
      
      ///@notice Response Msg for ABI server
      
      string response_success_msg = "200_OK";
      string response_post_success_msg = "201_OK";
      string response_fail_msg = "400_FAIL";
  
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
       * @notice Set all contract behavior log recorded in this struct object
       * 
       * @string:who -> dreaming / userId
       * @uint:timestamp -> when transaction occurred
       * @string:where -> group_id
       * @uint:amount -> how mouch amount of money is transacted
       * @string:from -> from
       * @string:to -> to
       * @string:why -> transaction reason 
       */
      struct DreamingLog {
        string who;
        uint timestamp;
        string where;
        uint amount;
        string from;
        string to;
        string why;
      }

      DreamingLog[] dreamingLogs;
  
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
          string payer_id;
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
          string deposit_payer_id;
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
      */
      struct GroupContract {
          string leader_id;
          string group_id;
          uint group_capacity; 
          uint group_deposit_per_person; 
          uint group_deadline;
          GroupStatus groupStatus;
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
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function setStudyGroupContracts(
          string memory leader_id,
          string memory group_id,
          uint group_capacity,
          uint group_deposit_per_person,
          uint group_period
      ) isRun onlyOwner public returns(string memory) {
      
          groupContract = GroupContract(
              leader_id, group_id, group_capacity, group_deposit_per_person, (block.timestamp + (group_period * 1 days)), GroupStatus(0)
          );
          
          return(response_post_success_msg);
          
      }
  
  
      /**
      * @notice Check if the points the client wants to pay are equal to the preset deposit
      * @param client_payment : Points paid by the client
      * @dev This Function is only callable in the contract
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function callCheckGroupDeposit(
          uint client_payment
      ) private view returns(bool) {
          if (groupContract.group_deposit_per_person == client_payment) {
              return(true);
          } else {
              return(false);
          }
      }
  
      /**
      * @notice Check whether the user has paid
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function callCheckClientPaymentComplition(
          string memory deposit_payer_id
      ) isRun public view returns(string memory) {
          require(studyGroupDeposits.length != 0, "No one pay the deposit");
          for (uint i; i < studyGroupDeposits.length; i++) {
              if(keccak256(bytes(studyGroupDeposits[i].deposit_payer_id)) == keccak256(bytes(deposit_payer_id))) {
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
      * @notice Calling the study group's Contract details
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function callContractDetail() public view returns(GroupContract memory) {
          return(groupContract);
      }
    
  
      /**
      * @notice Calling the Dreaming's deposit accounting details
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function callDreamingDepositDetail() onlyOwner public view returns(DreamingDeposit memory) {
          return dreamingDeposit;
      }

      /**
      * @notice Calling the dreaming log array
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function callDreamingLog() onlyOwner public view returns(DreamingLog[] memory) {
          return dreamingLogs;
      }
  
  
      /**
      * @notice Request to add the deposit amount to the deposit according to the contract 
      *         Change status if paid in full
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function patchClientPaymentDeposit(
          string memory deposit_payer_id,
          string memory warrenty_pledge,
          string memory group_id,
          uint deposit_amount
      ) isRun onlyOwner public returns(GroupStatus, string memory) {
          require(callCheckGroupDeposit(deposit_amount), "deposit amount is not same in the contarct");

          studyGroupDeposits.push(Deposit(
              deposit_payer_id,
              warrenty_pledge,
              deposit_amount,
              block.timestamp
          ));
          dreamingLogs.push(DreamingLog(deposit_payer_id, block.timestamp, "dreaming_app", deposit_amount, "dreaming_app", group_id, "deposit payment for enrollment"));
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
          string memory deposit_payer_id,
          string memory group_id
      ) isRun onlyOwner public returns(string memory) {
          uint returnableDepositAmount = 0;
          for (uint i = 0; i < studyGroupDeposits.length; i++) {
              if(keccak256(bytes(studyGroupDeposits[i].deposit_payer_id)) == keccak256(bytes(deposit_payer_id))) {
                  dreamingLogs.push(DreamingLog(deposit_payer_id, block.timestamp, group_id, studyGroupDeposits[i].deposit_amount, group_id, "contract memory", "The deposit was taken because the user was kicked out."));
                  returnableDepositAmount += studyGroupDeposits[i].deposit_amount;
                  studyGroupDeposits[i].deposit_amount = 0;
                  break;
              }
          }
  
          /// @dev split equally among the rest and Dreaming. Because Solidity can not handle float type
          returnableDepositAmount /= studyGroupDeposits.length;
          dreamingDeposit.deposit_balance += returnableDepositAmount;
          dreamingLogs.push(DreamingLog("dreaming", block.timestamp, "contract memory", returnableDepositAmount, "contract memory", "dreaming finance", "The deposit is distributed because user was kicked."));
          dreamingDeposit.dreamingFinance.push(DreamingFinance(groupContract.group_id, deposit_payer_id, "Kick of player", returnableDepositAmount, block.timestamp));
  
          for (uint i = 0; i < studyGroupDeposits.length; i++) {
              if(keccak256(bytes(studyGroupDeposits[i].deposit_payer_id)) != keccak256(bytes(deposit_payer_id))) {
                  dreamingLogs.push(DreamingLog(studyGroupDeposits[i].deposit_payer_id, block.timestamp, "contract memory", returnableDepositAmount, "contract memory", group_id, "The deposit is distributed because user was kicked."));
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
      function patchAttributeAllDepositsToDreaming(
        string memory group_id
      ) isRun onlyOwner private returns(string memory) {
          uint returnableDepositAmount = 0;
  
          for (uint i = 0; i < studyGroupDeposits.length; i++) {
              dreamingLogs.push(DreamingLog(studyGroupDeposits[i].deposit_payer_id, block.timestamp, group_id, studyGroupDeposits[i].deposit_amount, group_id, "contract memory", "Forfeiture of deposit due to breach of contract"));
              returnableDepositAmount += studyGroupDeposits[i].deposit_amount;
              studyGroupDeposits[i].deposit_amount = 0;
          }
  
          dreamingDeposit.deposit_balance += returnableDepositAmount;
          dreamingDeposit.dreamingFinance.push(DreamingFinance(groupContract.group_id, "All Payed", "Boom Study Group ( breach of contract )", returnableDepositAmount, block.timestamp));
          dreamingLogs.push(DreamingLog("dreaming", block.timestamp, "contract memory", returnableDepositAmount, "contract memory", "dreaming finance", "dreaming earn money because Forfeiture of deposit due to breach of contract"));
          return(response_post_success_msg);
      }
  
      /**
      * @notice Status change request after checking group termination conditions
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function putGroupStatusStartToEnd() isRun public returns(GroupStatus, string memory, GroupContract memory) {
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
          dreamingLogs.push(DreamingLog("dreaming", block.timestamp, "dreaming finance", revenueOfDreamingInThisContract, "dreaming finance", "dreaming app", "settles the profit that the service can earn."));
          return revenueOfDreamingInThisContract;
      }
  
      /**
      * @notice Study group stop request (when group_status is pending or end)
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function stopStudyGroupContract() isRun public returns(string memory) {
          GroupStatus groupStatus = groupContract.groupStatus;
          require(groupStatus != GroupStatus(1), "Study is running now");
          require(dreamingDeposit.deposit_balance == 0, "Dreaming Deposit is not payed to Dreaming");
          isContractRun = false;
          return(response_post_success_msg);
      }    
      
          
  }
  
  
  
  