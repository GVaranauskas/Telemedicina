import { Module } from '@nestjs/common';
import { InstitutionWorkforceService } from './institution-workforce.service';
import { InstitutionWorkforceController } from './institution-workforce.controller';

@Module({
  controllers: [InstitutionWorkforceController],
  providers: [InstitutionWorkforceService],
  exports: [InstitutionWorkforceService],
})
export class InstitutionWorkforceModule {}
