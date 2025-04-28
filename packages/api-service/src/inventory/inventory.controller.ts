import { Controller, Post, Get, Put, Delete, Body } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  CreateGameInventoryDto,
  UpdateGameInventoryDto,
  GetGameInventoryDto,
} from './dto/inventory.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('inventory')
@ApiTags('Inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create new inventory' })
  @ApiResponse({ status: 201, description: 'Inventory created successfully' })
  async create(@Body() dto: CreateGameInventoryDto) {
    return this.inventoryService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get inventory by wallet address' })
  @ApiResponse({ status: 200, description: 'Returns the inventory' })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  async get(@Body() dto: GetGameInventoryDto) {
    return this.inventoryService.get(dto);
  }

  @Put()
  @ApiOperation({ summary: 'Update inventory' })
  @ApiResponse({ status: 200, description: 'Inventory updated successfully' })
  async update(@Body() dto: UpdateGameInventoryDto) {
    return this.inventoryService.update(dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete inventory' })
  @ApiResponse({ status: 200, description: 'Inventory deleted successfully' })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  async delete(@Body() dto: GetGameInventoryDto) {
    return this.inventoryService.delete(dto);
  }
}
