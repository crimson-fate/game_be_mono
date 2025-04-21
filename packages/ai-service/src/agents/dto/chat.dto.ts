import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class ChatDto {
  @ApiProperty({
    description: 'Message to send to the AI agent',
    example: 'What should I do next?',
  })
  @IsString()
  @MinLength(1)
  message: string;

  @ApiProperty({
    description: 'Wallet address of the user',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: false,
  })
  @IsString()
  walletAddress?: string;
}

// DTO for the response - can be text or operation
export class ChatResponseDto {
  @ApiProperty({
    description: 'Response message from Kael',
    example: 'Be cautious, adventurer. The dungeon feeds on impatience.',
  })
  content: string;

  @ApiProperty({
    description: 'Operation type if a dungeon operation was requested',
    example: 'clean',
    required: false,
  })
  operationType?: string;

  @ApiProperty({
    description: 'ID of the dungeon for operations',
    example: 'current',
    required: false,
  })
  dungeonId?: string;

  @ApiProperty({
    description: 'Additional operation details',
    example: '{ "area": "north wing", "intensity": "full" }',
    required: false,
  })
  details?: Record<string, any>;
}
