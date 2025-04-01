import configuration from '@app/shared/configuration';
import { ObjectManager } from '@filebase/sdk';
import fs from 'fs';
export class S3StoryService {
  constructor() {
    this.objectManager = new ObjectManager(
      configuration().S3_KEY,
      configuration().S3_SECRET,
      {
        bucket: configuration().S3_BUCKET,
      },
    );
  }
  objectManager: ObjectManager;

  public async uploadFile(file: any, body: any) {
    const uploadedObject = await this.objectManager.upload(
      body.nameHash + body.fileType,
      fs.createReadStream(file.path), // file
      {}, // metadata
      {}, // options
    );

    return uploadedObject;
  }
}
