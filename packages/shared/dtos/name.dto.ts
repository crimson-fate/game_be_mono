import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { BaseSchema } from '../models/base.schema';
import { Name } from '../models/names.schema';

export class NameDto extends BaseSchema {
  @ApiProperty({ description: 'The ID of the Story Names (ERC721)' })
  @IsString()
  tokenId: string;

  @ApiProperty({ description: 'The user`s ENS name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'The hash of the ENS name' })
  @IsOptional()
  @IsString()
  nameHash?: string;

  @ApiProperty({
    description: 'The label of the ENS name. Without TLD (.story)',
  })
  @IsString()
  label: string;

  @ApiProperty({
    description:
      'The hash of the label. Server will hash it based on the label above',
  })
  @IsOptional()
  @IsString()
  labelHash?: string;

  @ApiProperty({ description: 'Blockchain network of the Name Service' })
  @IsString()
  chain: string;

  @ApiProperty({ description: 'The owner address of the ENS' })
  @IsString()
  owner: string;

  @ApiProperty({ description: 'The metadata URL for the Story name' })
  @IsUrl()
  metadataUrl: string;

  @ApiProperty({ description: 'The status of the name' })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Indicates if this is the primary name for the owner',
  })
  @IsBoolean()
  isPrimaryName: boolean;

  @ApiProperty({ description: 'The expiration time of the name in seconds' })
  @IsNumber()
  expiresAt: number;

  @ApiProperty({
    description:
      'Banner URL for the name. This will be used in the marketplace',
  })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiProperty({
    description: 'Logo URL for the name. This will be used in the marketplace',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  static from(name: Name): NameDto {
    return {
      tokenId: name.tokenId,
      name: name.name,
      nameHash: name.nameHash,
      label: name.label,
      labelHash: name.labelHash,
      chain: name.chain,
      owner: name.owner,
      metadataUrl: name.metadataUrl,
      type: name.type,
      isPrimaryName: name.isPrimaryName,
      expiresAt: name.expiresAt,
      createdAt: name.createdAt,
      updatedAt: name.updatedAt,
      logoUrl: name.logoUrl,
      bannerUrl: name.bannerUrl,
    };
  }
}
