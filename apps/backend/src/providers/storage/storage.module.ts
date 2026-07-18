import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalFsStorageProvider } from './local-fs.provider';
import { MinioStorageProvider } from './minio.provider';
import { STORAGE_PROVIDER } from './storage.provider';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('STORAGE_PROVIDER', 'local');
        if (provider === 'minio') {
          return new MinioStorageProvider(config);
        }
        return new LocalFsStorageProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
