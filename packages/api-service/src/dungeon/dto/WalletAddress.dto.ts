import { IsHexadecimal, IsNotEmpty } from 'class-validator';

export class walletAddressDto {
  @IsHexadecimal()
  @IsNotEmpty()
  walletAddress: string;
}
