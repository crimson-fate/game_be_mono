import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseSchema } from '../models/base.schema';
import { IpaMetadata } from '../models/ip-metadata';

enum IpaStatus {
  Offchain = 'Offchain',
  Onchain = 'Onchain',
}

class IpCreatorSocialDto {
  @ApiProperty({ description: 'Social media platform', example: 'Twitter' })
  @IsString()
  platform: string;

  @ApiProperty({ description: 'URL to the social media profile', example: 'https://twitter.com/example' })
  @IsString()
  url: string;
}

class IpCreatorDto {
  @ApiProperty({ description: 'Name of the creator', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Blockchain address of the creator', example: '0x1234567890abcdef1234567890abcdef12345678' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: 'Description of the creator', example: 'An experienced artist' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Image URL for the creator', example: 'https://example.com/image.png' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    description: 'Social media links for the creator',
    type: [IpCreatorSocialDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IpCreatorSocialDto)
  socialMedia?: IpCreatorSocialDto[];

  @ApiPropertyOptional({ description: 'Role of the creator', example: 'Author' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: 'Contribution percentage of the creator', example: 50 })
  @IsString()
  contributionPercent: number;
}

class IpAttributeDto {
  @ApiProperty({ description: 'Attribute key', example: 'Genre' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Attribute value', example: 'Adventure' })
  @IsString()
  value: string;
}

class IpRelationshipDto {
  @ApiProperty({ description: 'Type of relationship', example: 'APPEARS_IN' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Target entity of the relationship', example: 'chapter-1' })
  @IsOptional()
  @IsString()
  target?: string;
}

class IpMediaDto {
  @ApiProperty({ description: 'Type of media', example: 'image' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'URL to the media', example: 'https://example.com/media.png' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: 'Description of the media', example: 'Cover art' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class IpaMetadataDto extends BaseSchema {
  @ApiProperty({ description: 'Title of the IP Asset', example: 'Kenta the Samurai Azuki' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description of the IP Asset', example: 'An adventurous samurai story.' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Type of the IP Asset', example: 'logo' })
  @IsString()
  ipType: string;

  @ApiProperty({ description: 'Status of the IPA Metadata', example: 'Onchain', enum: IpaStatus })
  @IsEnum(IpaStatus)
  status: IpaStatus;

  @ApiPropertyOptional({ description: 'Relationships with other IPAs', type: [IpRelationshipDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IpRelationshipDto)
  relationships: IpRelationshipDto[];

  @ApiProperty({ description: 'Creation date of the IP Asset', example: '2023-11-17T10:00:00.000Z' })
  @IsString()
  createdAt: string;

  @ApiPropertyOptional({ description: 'Watermark image URL', example: 'https://example.com/watermark.png' })
  @IsOptional()
  @IsString()
  watermarkImage?: string;

  @ApiPropertyOptional({ description: 'Creators of the IP Asset', type: [IpCreatorDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IpCreatorDto)
  creators: IpCreatorDto[];

  @ApiPropertyOptional({ description: 'Media associated with the IP Asset', type: [IpMediaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IpMediaDto)
  media: IpMediaDto[];

  @ApiPropertyOptional({ description: 'Attributes of the IP Asset', type: [IpAttributeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IpAttributeDto)
  attributes: IpAttributeDto[];

  @ApiPropertyOptional({ description: 'Tags associated with the IP Asset', type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({ description: 'URL to the media', example: 'https://example.com/media.png' })
  @IsString()
  assetImage: string;

  @ApiProperty({
    description: 'ipId of the ipMetadata',
    example: '0xc2f9eC24643E1bE32011F254584b8f89A9508727',  })
  @IsString()
  ipId?: string;

  static from(ipaMetadata: IpaMetadata): IpaMetadataDto {
    return {
      title: ipaMetadata.title,
      description: ipaMetadata.description,
      ipType: ipaMetadata.ipType,
      status: ipaMetadata.status,
      relationships: ipaMetadata.relationships,
      createdAt: ipaMetadata.createdAt,
      watermarkImage: ipaMetadata.watermarkImage,
      creators: ipaMetadata.creators,
      media: ipaMetadata.media,
      attributes: ipaMetadata.attributes,
      tags: ipaMetadata.tags,
      assetImage: ipaMetadata.assetImage,
      ipId: ipaMetadata.ipId
    };
  }
}
