import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class SeasonIdDto {
  @IsMongoId()
  seasonId: string;
}

export class GetCurrentRankDto extends SeasonIdDto {
  @IsNotEmpty()
  @IsString()
  // Add appropriate validation for wallet address if needed (e.g., @IsEthereumAddress from class-validator if applicable)
  walletAddress: string;
}
