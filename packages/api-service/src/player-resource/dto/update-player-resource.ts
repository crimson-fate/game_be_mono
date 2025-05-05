import { IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class CommonResourceDto {
  @IsOptional() @IsNumber() @Type(() => Number) Coin?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Cash?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Energy?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Exp?: number;
  @IsOptional() @IsNumber() @Type(() => Number) HeroPiece?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Revival?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Silver_Key?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Golden_Key?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Forge_Hamer?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Daily_Active_Point?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Weekly_Active_Point?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Achivement_Point?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Coin_Time_Reward?: number;
  @IsOptional() @IsNumber() @Type(() => Number) AgentActivator?: number;
}

class SoulPieceResourceDto {
  @IsOptional() @IsNumber() @Type(() => Number) Mechanic_Soul?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Fire_Soul?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Lightning_Soul?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Mythic_Soul?: number;
  @IsOptional() @IsNumber() @Type(() => Number) Pollute_Soul?: number;
}

export class UpdatePlayerResourceDto {
  @IsOptional() dicCommonResource?: CommonResourceDto;

  @IsOptional() dicSoulPieceResource?: SoulPieceResourceDto;
}
