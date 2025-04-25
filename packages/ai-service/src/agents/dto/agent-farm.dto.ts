import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAgentFarmDto {
  @ApiProperty({ description: 'Wallet address of the player' })
  @IsString()
  walletAddress: string;

  @ApiProperty({ description: 'Whether the player is currently farming' })
  @IsBoolean()
  isFarming?: boolean;

  @ApiProperty({ description: 'Start time of farming in milliseconds' })
  @IsNumber()
  startTime?: number;

  @ApiProperty({ description: 'Duration of farming in milliseconds' })
  @IsNumber()
  duration?: number;

  @ApiProperty({
    description: 'Item counts by rarity',
    example: { common: 0, rare: 0, epic: 0, legendary: 0 },
  })
  @IsObject()
  @IsOptional()
  itemCounts?: {
    common: number;
    rare: number;
    epic: number;
    legendary: number;
  };
}

export class UpdateAgentFarmDto {
  @ApiProperty({ description: 'Whether the player is currently farming' })
  @IsBoolean()
  isFarming: boolean;

  @ApiProperty({ description: 'Start time of farming in milliseconds' })
  @IsNumber()
  startTime: number;

  @ApiProperty({ description: 'Duration of farming in milliseconds' })
  @IsNumber()
  duration: number;

  @ApiProperty({
    description: 'Item counts by rarity',
    example: { common: 0, rare: 0, epic: 0, legendary: 0 },
  })
  @IsOptional()
  @IsObject()
  itemCounts?: {
    common: number;
    rare: number;
    epic: number;
    legendary: number;
  };
}
