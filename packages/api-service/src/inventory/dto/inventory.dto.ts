import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsObject,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryItemDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class EquipmentDto {
  @IsString()
  @IsNotEmpty()
  equipmentId: string;

  @IsNumber()
  @IsNotEmpty()
  level: number;

  @IsObject()
  @IsNotEmpty()
  stats: Record<string, number>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class InventoryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  items: InventoryItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipmentDto)
  equipment: EquipmentDto[];

  @IsObject()
  resources: Record<string, number>;
}

export class CreateInventoryDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsObject()
  @ValidateNested()
  @Type(() => InventoryDto)
  inventory: InventoryDto;
}

export class UpdateInventoryDto extends CreateInventoryDto {}

export class GetInventoryDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

export class GameEquipmentDto {
  @IsBoolean()
  randomSkill: boolean;

  @IsBoolean()
  randomAttribute: boolean;

  @IsString()
  @IsNotEmpty()
  equipemntID: string;

  @IsNumber()
  currrentRarity: number;

  @IsNumber()
  baseAttribute: number;

  @IsNumber()
  skillLink: number;

  @IsNumber()
  currentUpradeLevel: number;

  @IsBoolean()
  isNewEquipment: boolean;

  @IsArray()
  @IsString({ each: true })
  lstSubAttributeKey: string[];

  @IsNumber()
  resourceValue: number;
}

export class GameInventoryDto {
  @IsBoolean()
  sortByType: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GameEquipmentDto)
  lstOwned: GameEquipmentDto[];

  @IsObject()
  dicEquippedKey: Record<string, string>;
}

export class CreateGameInventoryDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsObject()
  @ValidateNested()
  @IsOptional()
  @Type(() => GameInventoryDto)
  inventory?: GameInventoryDto;
}

export class UpdateGameInventoryDto extends CreateGameInventoryDto {}

export class GetGameInventoryDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}
