export const ABIS = {
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
  MintAndRegisterIpAndAttachPILTerms: [
    'function mintAndRegisterIpAndAttachPILTerms(address spgNftContract, address recipient, (string,bytes32,string,bytes32) ipMetadata, (bool,address,uint256,uint256,bool,bool,address,bytes,uint32,uint256,bool,bool,bool,bool,uint256,address,string) terms)',
  ],
};

export const EventSignatures = {
  NameRegistered:
    '0x0667086d08417333ce63f40d5bc2ef6fd330e25aaaf317b7c489541f8fe600fa',
  ReverseClaimed:
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
