import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class JwtPayload {
  sub: string; //address user
  userAddress: string;
  // role?: string[];
}
export class iInfoToken extends JwtPayload {
  @ApiProperty()
  @IsNumber()
  iat: number;

  @ApiProperty()
  @IsNumber()
  exp: number;
}
