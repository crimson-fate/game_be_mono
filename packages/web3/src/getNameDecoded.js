const axios = require('axios');
const { ethers } = require('ethers');
const { labelhash, namehash } = require('viem');

// ABIs for different events
const abis = {
  NameRegistered: [
    'event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint256 expires)',
  ],
  ReverseClaimed: [
    'event BaseReverseClaimed(address indexed addr, bytes32 indexed node)',
  ],
  Transfer: [
    'event Transfer(address indexed from, address indexed to, uint256 indexed id)',
  ],
  TextChanged: [
    'event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value)',
  ],
  NameRenewed: ['event NameRenewed(uint256 indexed id, uint256 expires)'],
  IPRegistered: [
    'event IPRegistered(address ipId, uint256 indexed chainId, address indexed tokenContract, uint256 indexed tokenId, string name, string uri, uint256 registrationDate)',
  ],
  mintAndRegisterIpAndAttachPILTerms: [
    'function mintAndRegisterIpAndAttachPILTerms(address spgNftContract, address recipient, (string,bytes32,string,bytes32) ipMetadata, (bool,address,uint256,uint256,bool,bool,address,bytes,uint32,uint256,bool,bool,bool,bool,uint256,address,string) terms)',
  ],
};

// Event signature hashes for different events
const eventSignatures = {
  NameRegistered:
    '0x0667086d08417333ce63f40d5bc2ef6fd330e25aaaf317b7c489541f8fe600fa',
  BaseReverseClaimed:
    '0x94a5ce4d9c1b6f48709de92cd4f882a72e6c496245ed1f72edbfcce4a46f0b37',
  Transfer:
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  TextChanged:
    '0x448bc014f1536726cf8d54ff3d6481ed3cbc683c2591ca204274009afa09b1a1',
  NameRenewed:
    '0x9b87a00e30f1ac65d898f070f8a3488fe60517182d0a2098e1b4b93a54aa9bd6',
  IPRegistered:
    '0x02ad3a2e0356b65fdfe4a73c825b78071ae469db35162978518b8c258abb3767',
};

// API parameters
const instanceBaseUrl = 'https://odyssey.storyscan.xyz/api';
const fromBlock = '745589'; // Starting block number
const toBlock = '745590'; // Ending block number
const ETHRegistrarAddress = '0xD8Ac44e71cf3A8D5d2C8BBC223d846b5aB3BEe3A';
const ReverseRegistrarAddress = '0x62f389864335730cCBccf75d109E992370f12dbC';
const StoryRegistrarAddress = '0xF008A94bc7c1e5fD9cAA04e0B1E80FC8D534c57a';
const StoryResolver = '0x770B8b351883F2ac1D621cADB07Fe2cc265DdcD9';
const IPAssetRegistry = '0x28E59E91C0467e89fd0f0438D47Ca839cDfEc095';
const LicenseAttachmentWorkflows = '0x44Bad1E4035a44eAC1606B222873E4a85E8b7D9c';
const IPA_LOGO = '0x4b334A66e2fcc7795bc6EE4FE3Ce938C3619237E'.toLowerCase();
const IPA_BANNER = '0x07eA0232Ab5E9C99B2C9659F93bB491E26C45801'.toLowerCase();

const serverURL = 'https://beta-api.storyname.space';
// Construct the API URLs to get events from 2 contracts

// const instanceBaseUrl = 'https://testnet.storyscan.xyz/api';
const urls = [
  `${instanceBaseUrl}?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=${ETHRegistrarAddress}&topic0=${eventSignatures.NameRegistered}`,
  `${instanceBaseUrl}?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=${ReverseRegistrarAddress}&topic0=${eventSignatures.ReverseClaimed}`,
];

// Function to fetch event logs and decode them
async function getAndDecodeEventLogs() {
  try {
    // Fetch logs from both URLs
    const logs = [];
    for (const apiUrl of urls) {
      const response = await axios.get(apiUrl);
      if (response.data.result) {
        logs.push(...response.data.result);
      }
    }

    if (logs.length > 0) {
      console.log(`Received ${logs.length} logs from the API.`);

      // Process NameRegistered events first
      logs.forEach((log) => {
        if (log.topics[0] === eventSignatures.NameRegistered) {
          decodeNameRegistered(log, logs);
        }
      });
    } else {
      console.log('No logs returned from the API.');
    }
  } catch (error) {
    console.error('Error fetching logs:', error.message);
  }
}

// Function to decode NameRegistered event
function decodeNameRegistered(log, allLogs) {
  const iface = new ethers.Interface(abis.NameRegistered);

  try {
    const owner = ethers.getAddress(log.topics[2].slice(-40));
    const decodedData = iface.decodeEventLog('NameRegistered', log.data);
    const tokenId = labelhash(decodedData.name);
    const ipNameHash = namehash(`${decodedData.name}.ip`);
    const isPrimary = checkReverseClaimed(owner, allLogs);

    console.log('Decoded NameRegistered Event:', {
      tokenId: tokenId,
      name: `${decodedData.name}.ip`,
      namehash: ipNameHash,
      label: decodedData.name,
      chain: 'Iliad',
      owner: owner,
      metadataUrl: `${serverURL}/metadata/${tokenId}`,
      type: 'ONCHAIN',
      expires: decodedData[3].toString() * 1000,
      isPrimaryName: isPrimary,
    });
  } catch (error) {
    console.error('Error decoding NameRegistered event:', error.message);
  }
}

// Function to check PrimaryName at Register
function checkReverseClaimed(owner, allLogs) {
  return allLogs.some((log) => {
    return (
      log.topics[0] === eventSignatures.BaseReverseClaimed &&
      ethers.getAddress(log.topics[1].slice(-40)) === owner
    );
  });
}

//=== Transfer Event ===//
async function getTransferEventLogs() {
  try {
    // API URL for TransferSingle logs
    const apiUrl = `${instanceBaseUrl}?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=${StoryRegistrarAddress}&topic0=${eventSignatures.Transfer}`;

    // Fetch logs from the API
    const response = await axios.get(apiUrl);
    const logs = response.data.result;

    if (logs && logs.length > 0) {
      console.log(`Received ${logs.length} TransferSingle logs from the API.`);

      logs.forEach((log) => {
        if (log.topics[0] === eventSignatures.Transfer) {
          const from = ethers.getAddress(log.topics[1].slice(-40));
          const to = ethers.getAddress(log.topics[2].slice(-40));
          const id = log.topics[3];
          try {
            if (from === '0x0000000000000000000000000000000000000000') {
              return;
            }

            console.log('Decoded TransferSingle Event:', {
              oldOwner: from,
              newOwner: to,
              tokenId: id,
            });
          } catch (error) {
            console.error(
              'Error decoding TransferSingle event:',
              error.message,
            );
          }
        }
      });
    } else {
      console.log('No TransferSingle logs returned from the API.');
    }
  } catch (error) {
    console.error('Error fetching TransferSingle logs:', error.message);
  }
}

//=== Update Profile Event ===//
/* => TODO: Records
@Note: Cai event nay co namehash, de check duoc record phai lay namehash(name) 
trong Record schema nha==> const { namehash } = require('viem');
*/
async function getTextChangedEventLogs() {
  try {
    // API URL for TextChanged logs
    const apiUrl = `${instanceBaseUrl}?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=${StoryResolver}&topic0=${eventSignatures.TextChanged}`;

    // Fetch logs from the API
    const response = await axios.get(apiUrl);
    const logs = response.data.result;

    if (logs && logs.length > 0) {
      console.log(`Received ${logs.length} TextChanged logs from the API.`);

      logs.forEach((log) => {
        if (log.topics[0] === eventSignatures.TextChanged) {
          try {
            const iface = new ethers.Interface(abis.TextChanged);
            const decodedData = iface.decodeEventLog('TextChanged', log.data);

            console.log('Decoded TextChanged Event:', {
              nameHash: log.topics[1],
              key: decodedData.key,
              value: decodedData.value,
            });
          } catch (error) {
            console.error('Error decoding TextChanged event:', error.message);
          }
        }
      });
    } else {
      console.log('No TextChanged logs returned from the API.');
    }
  } catch (error) {
    console.error('Error fetching TextChanged logs:', error.message);
  }
}

//=== Extend Name Event ===//
// Function to fetch and decode NameRenewed (ExtendName) event logs
async function getNameRenewedEventLogs() {
  try {
    // API URL for NameRenewed logs
    const apiUrl = `${instanceBaseUrl}?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=${StoryRegistrarAddress}&topic0=${eventSignatures.NameRenewed}`;

    // Fetch logs from the API
    const response = await axios.get(apiUrl);
    const logs = response.data.result;

    if (logs && logs.length > 0) {
      console.log(`Received ${logs.length} NameRenewed logs from the API.`);

      logs.forEach((log) => {
        if (log.topics[0] === eventSignatures.NameRenewed) {
          try {
            const iface = new ethers.Interface(abis.NameRenewed);
            const decodedData = iface.decodeEventLog('NameRenewed', log.data);

            console.log('Decoded NameRenewed Event:', {
              tokenId: log.topics[1],
              expires: decodedData.expires.toString() * 1000, // Convert to milliseconds
            });
          } catch (error) {
            console.error('Error decoding NameRenewed event:', error.message);
          }
        }
      });
    } else {
      console.log('No NameRenewed logs returned from the API.');
    }
  } catch (error) {
    console.error('Error fetching NameRenewed logs:', error.message);
  }
}

async function getIPRegisteredLogsAndFuncData() {
  try {
    // API URL to fetch transactions
    const txApiUrl = `${instanceBaseUrl}?module=account&action=txlist&address=${LicenseAttachmentWorkflows}&startblock=${fromBlock}&endblock=${toBlock}&sort=asc`;

    // API URL to fetch event logs
    const logApiUrl = `${instanceBaseUrl}?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=${IPAssetRegistry}&topic0=${eventSignatures.IPRegistered}`;

    // Fetch transactions and logs
    const [txResponse, logResponse] = await Promise.all([
      axios.get(txApiUrl),
      axios.get(logApiUrl),
    ]);

    const transactions = txResponse.data.result;
    const logs = logResponse.data.result;

    if (!transactions || transactions.length === 0) {
      console.log('No transactions found for the specified range.');
    } else {
      console.log(`Fetched ${transactions.length} transactions.`);
    }

    if (!logs || logs.length === 0) {
      console.log('No logs found for the specified range.');
    } else {
      console.log(`Fetched ${logs.length} logs.`);
    }

    // Define interfaces
    const funcIface = new ethers.Interface(
      abis.mintAndRegisterIpAndAttachPILTerms,
    );
    const eventIface = new ethers.Interface(abis.IPRegistered);

    const methodId = '0x02bd3091'; // Method ID for mintAndRegisterIpAndAttachPILTerms

    transactions.forEach((tx) => {
      if (tx.input.startsWith(methodId)) {
        try {
          // Decode transaction input data
          const decodedTx = funcIface.parseTransaction({ data: tx.input });

          // Filter for spgNftContract values of IPA_LOGO and IPA_BANNER
          const spgNftContract = decodedTx.args[0].toLowerCase();
          if (spgNftContract !== IPA_LOGO && spgNftContract !== IPA_BANNER) {
            return; // Skip non-matching contracts
          }

          console.log('Decoded Transaction Data:', {
            spgNftContract: decodedTx.args[0],
            recipient: decodedTx.args[1],
            ipMetadata: {
              uri: decodedTx.args[2][0],
              metadataHash: decodedTx.args[2][1],
              uri2: decodedTx.args[2][2],
              metadataHash2: decodedTx.args[2][3],
            },
          });

          // Find matching logs for this transaction
          const txLogs = logs.filter((log) => log.transactionHash === tx.hash);

          txLogs.forEach((log) => {
            if (log.topics[0] === eventSignatures.IPRegistered) {
              try {
                // Decode the event log
                const chainId = parseInt(log.topics[1], 16);
                const tokenContract = ethers.getAddress(
                  log.topics[2].slice(-40),
                ); // Get tokenContract

                const tokenId = parseInt(log.topics[3], 16);

                const decodedLog = eventIface.decodeEventLog(
                  'IPRegistered',
                  log.data,
                );

                console.log('Decoded Event Log Data:', {
                  ipId: decodedLog.ipId,
                  chainId: chainId,
                  tokenContract: tokenContract,
                  tokenId: tokenId,
                  name: decodedLog.name,
                  uri: decodedLog.uri,
                  registrationDate: Number(decodedLog.registrationDate) * 1000,
                });
              } catch (error) {
                console.error('Error decoding event log:', error.message, log);
              }
            }
          });
        } catch (error) {
          console.error('Error decoding transaction:', error.message, tx);
        }
      }
    });
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

//=== Set Primary Name Event ===//
async function getPrimaryNameEventLogs() {
  try {
    // API URL for BaseReverseClaimed logs
    const apiUrl = `${instanceBaseUrl}?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=${ReverseRegistrarAddress}&topic0=${eventSignatures.BaseReverseClaimed}`;

    // Fetch logs from the API
    const response = await axios.get(apiUrl);
    const logs = response.data.result;

    if (logs && logs.length > 0) {
      console.log(
        `Received ${logs.length} BaseReverseClaimed logs from the API.`,
      );

      logs.forEach((log) => {
        if (log.topics[0] === eventSignatures.BaseReverseClaimed) {
          try {
            console.log('Decoded SetPrimaryName Event:', {
              owner: ethers.getAddress(log.topics[1].slice(-40)),
              nameHash: log.topics[2],
            });
          } catch (error) {
            console.error(
              'Error decoding BaseReverseClaimed event:',
              error.message,
            );
          }
        }
      });
    } else {
      console.log('No BaseReverseClaimed logs returned from the API.');
    }
  } catch (error) {
    console.error('Error fetching BaseReverseClaimed logs:', error.message);
  }
}

// Call the function
getIPRegisteredLogsAndFuncData();
