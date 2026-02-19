import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from './dto/create-availability.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Doctor Availability')
@Controller('availability')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @ApiOperation({ summary: 'Add availability slot to a workplace' })
  async create(
    @CurrentUser('doctorId') doctorId: string,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.availabilityService.create(doctorId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all my availability slots' })
  async getMyAvailabilities(@CurrentUser('doctorId') doctorId: string) {
    return this.availabilityService.getMyAvailabilities(doctorId);
  }

  @Get('doctor/:doctorId')
  @ApiOperation({ summary: 'Get availability for a specific doctor (public for patients)' })
  async getDoctorAvailability(@Param('doctorId') doctorId: string) {
    return this.availabilityService.getDoctorAvailability(doctorId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an availability slot' })
  async update(
    @Param('id') id: string,
    @CurrentUser('doctorId') doctorId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.update(id, doctorId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an availability slot' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('doctorId') doctorId: string,
  ) {
    await this.availabilityService.delete(id, doctorId);
    return { message: 'Availability removed' };
  }
}
