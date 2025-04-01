import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';
import { BaseSchema } from '../models/base.schema';
import { Chain } from '../models/chain.schema';

export class ChainDto extends BaseSchema {
  @ApiProperty({ description: 'The unique identifier for the blockchain.' })
  @IsString()
  chainId: string;

  @ApiProperty({ description: 'The name of the blockchain.' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'The symbol of the blockchain.' })
  @IsString()
  symbol: string;

  @ApiProperty({ description: 'The RPC URL to interact with the blockchain.' })
  @IsUrl()
  rpcUrl: string;

  @ApiProperty({
    description: 'The explorer URL to view blockchain transactions and data.',
  })
  @IsUrl()
  explorerUrl: string;

  static from(chain: Chain): ChainDto {
    return {
      chainId: chain.chainId,
      name: chain.name,
      symbol: chain.symbol,
      rpcUrl: chain.rpcUrl,
      explorerUrl: chain.explorerUrl,
      createdAt: chain.createdAt,
      updatedAt: chain.updatedAt,
    };
  }
}
