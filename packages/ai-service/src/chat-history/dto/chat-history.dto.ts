import { IsString, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatHistoryQueryDto {
  @ApiProperty({
    description: 'Wallet address of the user',
    example: '0x123...abc',
  })
  @IsString()
  walletAddress: string;

  @ApiProperty({
    description: 'Number of records to return',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    description: 'Number of records to skip',
    example: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  skip?: number = 0;

  @ApiProperty({
    description: 'Filter by operation type',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isOperation?: boolean = false;

  @ApiProperty({
    description: 'Filter by dungeon ID',
    example: 'dungeon-1',
    required: false,
  })
  @IsOptional()
  @IsString()
  dungeonId?: string;
} 