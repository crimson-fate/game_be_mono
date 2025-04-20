import { ApiProperty } from '@nestjs/swagger';

export class ChatHistoryResponseDto {
  @ApiProperty({
    description: 'Wallet address of the user',
    example: '0x123...abc',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'User message',
    example: 'What should I do next?',
  })
  message: string;

  @ApiProperty({
    description: 'AI response',
    example: 'You should explore the eastern corridor.',
  })
  response: string;

  @ApiProperty({
    description: 'Whether this is a dungeon operation',
    example: false,
  })
  isOperation: boolean;

  @ApiProperty({
    description: 'Operation details if applicable',
    example: {
      type: 'explore',
      dungeonId: 'dungeon-1',
      details: { area: 'east' },
    },
    required: false,
  })
  operationDetails?: {
    type: string;
    dungeonId: string;
    details?: Record<string, any>;
  };

  @ApiProperty({
    description: 'Timestamp of the chat',
    example: '2024-04-20T19:28:29.000Z',
  })
  createdAt: Date;
} 