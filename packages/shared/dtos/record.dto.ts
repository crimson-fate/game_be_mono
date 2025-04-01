import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  ValidateNested,
  IsEthereumAddress,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseSchema } from '../models/base.schema';
import { EthNameRecord } from '../models/records.schema';

class AddressesDto {
  @ApiProperty({
    description: 'EVM address for Ethereum',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsEthereumAddress()
  '60': string;
}

class TextDataDto {
  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.png',
  })
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'User description',
    example: 'User description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'External website URL',
    example: 'https://example.com',
  })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({
    description: 'Warpcast handle',
    example: 'hayden27',
  })
  @IsOptional()
  @IsString()
  warpcast?: string;

  @ApiPropertyOptional({
    description: 'Twitter handle',
    example: '@userX',
  })
  @IsOptional()
  @IsString()
  twitter?: string;

  @ApiPropertyOptional({
    description: 'Telegram handle',
    example: '@userTel',
  })
  @IsOptional()
  @IsString()
  telegram?: string;

  @ApiPropertyOptional({
    description: 'Discord handle',
    example: 'user#1234',
  })
  @IsOptional()
  @IsString()
  discord?: string;

  @ApiPropertyOptional({
    description: 'Keywords containing skills of the user',
    example: 'Game Development, Solidity',
  })
  @IsOptional()
  @IsString()
  keywords?: string;
}

class DataDto {
  @ApiProperty({
    description: 'EVM address for different chains',
    type: AddressesDto,
  })
  @ValidateNested()
  @Type(() => AddressesDto)
  addresses: AddressesDto;

  @ApiPropertyOptional({
    description: 'Text data object containing optional details',
    type: TextDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TextDataDto)
  text?: TextDataDto;
}

export class RecordDto extends BaseSchema {
  @ApiProperty({
    description: 'Story name of the record',
    example: 'exampleName.story',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'ENS name on Ethereum',
    example: 'exampleName.evm',
  })
  @IsOptional()
  @IsString()
  ethName?: string;

  @ApiProperty({
    description: 'Data object containing addresses and optional text data',
    type: DataDto,
  })
  @ValidateNested()
  @Type(() => DataDto)
  data: DataDto;

  static from(record: EthNameRecord): RecordDto {
    return {
      name: record.name,
      ethName: record.ethName,
      data: {
        addresses: record.data.addresses,
        text: record.data.text,
      },
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
