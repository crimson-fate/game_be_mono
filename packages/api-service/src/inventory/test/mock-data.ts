export const mockInventoryData = {
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  inventory: {
    items: [
      {
        itemId: 'sword_001',
        quantity: 1,
        metadata: {
          rarity: 'rare',
          type: 'weapon',
          description: 'A sharp steel sword'
        }
      },
      {
        itemId: 'potion_001',
        quantity: 5,
        metadata: {
          type: 'consumable',
          effect: 'heal',
          value: 50
        }
      }
    ],
    equipment: [
      {
        equipmentId: 'armor_001',
        level: 3,
        stats: {
          defense: 15,
          durability: 100,
          weight: 5
        },
        metadata: {
          rarity: 'epic',
          set: 'dragon_armor',
          upgrade_slots: 2
        }
      }
    ],
    resources: {
      gold: 1000,
      silver: 5000,
      wood: 200,
      iron: 100
    }
  }
};

export const mockUpdateInventoryData = {
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  inventory: {
    items: [
      {
        itemId: 'sword_001',
        quantity: 2,
        metadata: {
          rarity: 'rare',
          type: 'weapon',
          description: 'A sharp steel sword'
        }
      },
      {
        itemId: 'potion_001',
        quantity: 10,
        metadata: {
          type: 'consumable',
          effect: 'heal',
          value: 50
        }
      }
    ],
    equipment: [
      {
        equipmentId: 'armor_001',
        level: 5,
        stats: {
          defense: 25,
          durability: 150,
          weight: 5
        },
        metadata: {
          rarity: 'epic',
          set: 'dragon_armor',
          upgrade_slots: 2
        }
      }
    ],
    resources: {
      gold: 2000,
      silver: 10000,
      wood: 400,
      iron: 200
    }
  }
}; 