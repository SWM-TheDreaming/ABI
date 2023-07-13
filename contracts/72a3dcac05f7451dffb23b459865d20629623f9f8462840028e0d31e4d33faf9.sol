// SPDX-License-Identifier: MIT
  pragma solidity ^0.8.18;
  
  
  
  /**
  * @title The dreaming despoit smart contract
  * @author lopahn2 / hwany9181@gmail.com
  * @notice Agent for deposit distributor
  */
  contract suite_contract {
  
      ///@notice When Contract be ended, ReadOnly
      bool isContractRun;
      
      ///@notice non kicked user size
      uint distributableDeositUserSize;

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
          uint deposit_amount;
          uint payment_timestamp;
          bool kicked_flag;
      }
  
      /**
      * @notice Study group contract details
      * @key:group_capacity -> unit (명)
      * @key:group_deposit_per_person -> unit (원)
      * @key:group_period -> unit (unix time)
      * @key:recruitment_period -> uint (unix time)
      * @key:minimum_attendance -> uint 
      * @key: minimum_mission_completion -> uint
      * @enum:GroupStatus 
      */
      struct GroupContract {
          string leader_id;
          string group_id;
          uint group_capacity; 
          uint group_deposit_per_person; 
          uint group_deadline;
          uint recruitment_period;
          uint minimum_attendance;
          uint minimum_mission_completion;
          GroupStatus groupStatus;
      }
  
      ///@notice Study Group Contract object for control
      GroupContract groupContract;
      
      /**
      * @notice Study groups Deposits Finance Info are handled by studyGroupDeposits Array
      */
      Deposit[] studyGroupDeposits;
      
        
      /**
      * @notice After stop the Study group, Final Study groups Deposits Balance and This Deposit[] only wrote one time.
      */
      Deposit[] finalStudyGroupDeposits;


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
      
      // ATTACHED
      /**
      * @notice Study group's initial contract create request handler
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function setStudyGroupContract(
          string memory leader_id,
          string memory group_id,
          uint group_capacity,
          uint group_deposit_per_person,
          uint group_period,
          uint recruitment_period,
          uint minimum_attendance,
          uint minimum_mission_completion
      ) isRun onlyOwner public returns(string memory) {
          groupContract = GroupContract(
              leader_id, group_id, group_capacity, group_deposit_per_person, (block.timestamp + (group_period * 1 days)),(block.timestamp + (recruitment_period * 1 days)),minimum_attendance ,minimum_mission_completion, GroupStatus(0)
          );
          distributableDeositUserSize = group_capacity + 1;
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
      ) isRun private view returns(bool) {
          if (groupContract.group_deposit_per_person == client_payment) {
              return(true);
          } else {
              return(false);
          }
      }

      /**
      * @notice Check the client already paid the deposit
      * @param user_id : Points paid by the client
      * @dev This Function is only callable in the contract
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function callCheckAlreadyPayment(
          string memory user_id
      ) isRun private view returns(bool) {
          for (uint i = 0; i < studyGroupDeposits.length; i++) {
            if(keccak256(bytes(studyGroupDeposits[i].deposit_payer_id)) == keccak256(bytes(user_id))) {
                return(false);
            }
          }
          return (true);
      }

      /**
      * @notice Check All clients are paid the deposit
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function callCheckAllClientsPayment() isRun private view returns(bool) {
          if (studyGroupDeposits.length == groupContract.group_capacity) {
            return true;
          } 
          return false;
      }
  
    //   /**
    //   * @notice Check whether the user has paid
    //   * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
    //   */
    //   function callCheckClientPaymentComplition(
    //       string memory deposit_payer_id
    //   ) isRun public view returns(string memory) {
    //       require(studyGroupDeposits.length != 0, "No one pay the deposit");
    //       for (uint i; i < studyGroupDeposits.length; i++) {
    //           if(keccak256(bytes(studyGroupDeposits[i].deposit_payer_id)) == keccak256(bytes(deposit_payer_id))) {
    //               if (studyGroupDeposits[i].deposit_amount == groupContract.group_deposit_per_person) {
    //                   return(response_success_msg);
    //               }
    //           }
    //       }
    //       return(response_fail_msg);
    //   }
  
      /**
      * @notice Calling the study group's deposit accounting details
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function callContractDepositDetail() isRun public view returns(Deposit[] memory) {
          return(studyGroupDeposits);
      }

      //ATTACHED
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
     
      //ATTACHED
      /**
      * @notice Calling the final study group deposits array
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function callFinalStudyGroupDeposits() onlyOwner public view returns(Deposit[] memory) {
          return finalStudyGroupDeposits;
      }
  
      //ATTACHED
      /**
      * @notice Request to add the deposit amount to the deposit according to the contract 
      * @return bool : flag of all group member pay the deposit
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function patchClientPaymentDeposit(
          string memory deposit_payer_id,
          string memory group_id,
          uint deposit_amount
      ) isRun onlyOwner public returns(string memory) {
          require(callCheckGroupDeposit(deposit_amount), "deposit amount is not same in the contarct");
          require(callCheckAlreadyPayment(deposit_payer_id), "Already paid the deposit");
          require(!callCheckAllClientsPayment(), "All Uer Already Paid the deposit");
          studyGroupDeposits.push(Deposit(
              deposit_payer_id,
              deposit_amount,
              block.timestamp,
              false
          ));

          dreamingLogs.push(DreamingLog(deposit_payer_id, block.timestamp, "dreaming_app", deposit_amount, "dreaming_app", group_id, "deposit payment for enrollment"));
          
          return(response_post_success_msg);
  
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
          require(distributableDeositUserSize > 1, "All People were kicked");
          uint returnableDepositAmount = 0;
          for (uint i = 0; i < studyGroupDeposits.length; i++) {
              if(keccak256(bytes(studyGroupDeposits[i].deposit_payer_id)) == keccak256(bytes(deposit_payer_id))) {
                  require(studyGroupDeposits[i].deposit_amount != 0, "deposit payer balance is already 0");
                  dreamingLogs.push(DreamingLog(deposit_payer_id, block.timestamp, group_id, studyGroupDeposits[i].deposit_amount, group_id, "contract memory", "The deposit was taken because the user was kicked out."));
                  returnableDepositAmount += studyGroupDeposits[i].deposit_amount;
                  studyGroupDeposits[i].deposit_amount = 0;
                  studyGroupDeposits[i].kicked_flag = true;
                  distributableDeositUserSize -= 1;
                  break;
              }
          }
  
          /// @dev split equally among the rest and Dreaming. Because Solidity can not handle float type
          returnableDepositAmount /= distributableDeositUserSize;
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
      * @notice Status change request after start condition
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function putGroupStatusPendingToStart() isRun public returns(GroupStatus, string memory, GroupContract memory) {
          require(groupContract.groupStatus == GroupStatus(0), "Study is not pending status");
          groupContract.groupStatus = GroupStatus(1);
          return(
              groupContract.groupStatus,
              response_post_success_msg,
              groupContract
          );
      }
      
      //ATTACHED
      /**
      * @notice Return Dreaming Revenue when Study is end and is not stop.
      *         Also Balance is not zero.
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function putSettleDeposit() isRun onlyOwner public returns(string memory) {
          uint _length = studyGroupDeposits.length;
          
          for (uint i = 0; i < _length; i++) {
              finalStudyGroupDeposits.push(studyGroupDeposits[i]);
              studyGroupDeposits[i].deposit_amount = 0;
              dreamingLogs.push(DreamingLog("dreaming", block.timestamp, studyGroupDeposits[i].deposit_payer_id, studyGroupDeposits[i].deposit_amount, studyGroupDeposits[i].deposit_payer_id, finalStudyGroupDeposits[i].deposit_payer_id, "Fixed final study group users balance"));
          }
          return response_success_msg;
      }
    
    
      //ATTACHED
      /**
      * @notice Study group stop request (when group_status is pending or end)
      * @custom:error-handling : Node ABI server is Oracle for onchain data. Error handling is done in ABI Server.
      */
      function stopStudyGroupContract() isRun public returns(string memory) {
          GroupStatus groupStatus = groupContract.groupStatus;
          require(groupStatus != GroupStatus(1), "Study is running now");

          isContractRun = false;
          return(response_post_success_msg);
      }    
      
    
          
  }
  
  