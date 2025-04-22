export const mockInventoryData = {
  walletAddress: '0x1234567890123456789012345678901234567890',
  inventory: {
    items: [
      {
        itemId: 'item-1',
        quantity: 5,
        type: 'consumable',
      },
      {
        itemId: 'item-2',
        quantity: 1,
        type: 'equipment',
      },
    ],
    equipment: [
      {
        itemId: 'equip-1',
        level: 1,
        type: 'weapon',
      },
    ],
  },
  stats: {
    totalItems: 2,
    totalEquipment: 1,
  },
};

export const mockUpdateInventoryData = {
  walletAddress: '0x1234567890123456789012345678901234567890',
  inventory: {
    items: [
      {
        itemId: 'item-1',
        quantity: 10,
        type: 'consumable',
      },
      {
        itemId: 'item-2',
        quantity: 2,
        type: 'equipment',
      },
    ],
    equipment: [
      {
        itemId: 'equip-1',
        level: 5,
        type: 'weapon',
      },
    ],
    resources: {
      gold: 2000,
    },
  },
}; 