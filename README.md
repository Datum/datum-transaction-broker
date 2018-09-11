# Transaction  Service

### Preface

During our work with web3 we faced the famous nonce issue.

Assuming we have 3 concurrent transactions A,B, and C, if 3 transaction are executed in order (Synchronously) there are no issues. However, once we are dealing with concurrent transactions Nonce count become an issue since all 3 transactions will get the same nonce count.

To resolve this problem, we decided to build a Transaction service that will handle all cases related to nonce, pending transactions,...etc

### Requirements

1) Nonce provider need to handle multiple requests sent in the same time.

2) Nonce provider must keep track of the pending transactions and handle transaction gap scenarios.

3) In case of application crash Nonce provider service need to be able to pick up from crash point, as well as sync and review current pending transactions and nonces

4) Nonce provider MUST not issue transactions more than Max number of pending transactions per mining node.

5) In case of mining Node crash all the pending transactions residing on the pool might be removed, Nonce provider has to handle this case.

6) In case of high throughput Nonce provider need to handle issuing nonces for multiple accounts to handle increase number of transaction requests.


### Architectural overview
![](./docs/imgs/overview.jpg)

##### Nonce Service
Mainly responsible of generating nonces and replay them if requested by status workers.

1) once Transaction service start, Nonce service will look into the current pending transaction  (executed transactions) and fetch current reported nonce count by mining nodes.

2) Once calibration occur (Max nonce count), it will generate additional nonces as long current length of nonce array <= 60

3) Nonce service can "replay" nonces provided by status workers

##### Transaction workers

Responsible of Fetching transaction from buffer queue, and signing it with their corresponding account PK.

Each Transaction worker is initialised with an account object containing address, account private key, and is used to sign incoming transactions.

Once a transaction worker sign and submit a transaction, it move the transaction to pending transaction queues that correspond to the TX worker, for example if we have 3 transaction workers then we will have 3 pending transaction queues that belong to each transaction worker.

##### Status workers

Responsible of :
1) checking current transaction status
2) If transaction is pending for too long (time limit is defined when we initialise the worker instance) then it will __replay the transaction nonce and resubmit raw transaction object to be resubmitting again by transaction workers__
3) If Status worker received a receipt for the transaction hash, it will mark it as complete and send the hash back as response to the requester


____
_Project is still under development, though the remaining effort is not much but in now way it should be used in production environment since this service is meant to serve high load, and require proper testing_
