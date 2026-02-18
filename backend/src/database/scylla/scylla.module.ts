import { Global, Module } from '@nestjs/common';
import { ScyllaService } from './scylla.service';
import { ScyllaSetupService } from './scylla-setup.service';

@Global()
@Module({
  providers: [ScyllaService, ScyllaSetupService],
  exports: [ScyllaService],
})
export class ScyllaModule {}
