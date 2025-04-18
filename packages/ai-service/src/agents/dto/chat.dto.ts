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
}
