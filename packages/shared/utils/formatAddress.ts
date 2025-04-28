import { HttpException, HttpStatus } from '@nestjs/common';

export const formattedContractAddress = (contractAddress: string) => {
  if (!contractAddress.startsWith('0x')) {
    throw new HttpException('Invalid Address', HttpStatus.BAD_REQUEST);
  }
  while (contractAddress.trim().length < 66) {
    contractAddress = contractAddress.trim().replace('0x', '0x0');
  }

  return contractAddress.toLowerCase().trim();
};

export const unformattedContractAddress = (contractAddress: string) => {
  while (contractAddress.startsWith('0x0')) {
    contractAddress = contractAddress.trim().replace('0x0', '0x');
  }

  return contractAddress.toLowerCase().trim();
};
