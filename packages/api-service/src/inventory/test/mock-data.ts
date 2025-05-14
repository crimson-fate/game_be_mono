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

export const mockGameInventoryData = {
  walletAddress: '0x123',
  inventory: {
    sortByType: false,
    lstOwned: [
      {
        randomSkill: false,
        randomAttribute: false,
        equipemntID: '86f56bf8-23e1-42a7-beef-8e0459dd94d0',
        currrentRarity: 1,
        baseAttribute: 2,
        skillLink: 12,
        currentUpradeLevel: 2,
        isNewEquipment: false,
        lstSubAttributeKey: [
          '(Raw_Attribute_Add)(Attack)(Common)(0)(0)(0)(25)',
          '(Raw_Attribute_Add)(Attack)(Great)(0)(0)(0)(35)',
        ],
        resourceValue: 1,
      },
    ],
    dicEquippedKey: {
      '1': '86f56bf8-23e1-42a7-beef-8e0459dd94d0',
    },
  },
};

export const mockUpdateGameInventoryData = {
  walletAddress: '0x123',
  inventory: {
    sortByType: true,
    lstOwned: [
      {
        randomSkill: true,
        randomAttribute: true,
        equipemntID: '86f56bf8-23e1-42a7-beef-8e0459dd94d0',
        currrentRarity: 2,
        baseAttribute: 3,
        skillLink: 13,
        currentUpradeLevel: 3,
        isNewEquipment: true,
        lstSubAttributeKey: [
          '(Raw_Attribute_Add)(Attack)(Common)(0)(0)(0)(25)',
        ],
        resourceValue: 2,
      },
    ],
    dicEquippedKey: {
      '1': '86f56bf8-23e1-42a7-beef-8e0459dd94d0',
      '2': '2a83a97b-1754-4d1c-b553-03584c570871',
    },
  },
};
