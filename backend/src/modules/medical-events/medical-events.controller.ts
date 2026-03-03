import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MedicalEventsService } from './medical-events.service';
import { EventsQueryDto } from './dto/events-query.dto';

@ApiTags('Medical Events')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MedicalEventsController {
  constructor(private readonly eventsService: MedicalEventsService) {}

  @Get()
  @ApiOperation({ summary: 'List medical events with filters' })
  findAll(@Query() query: EventsQueryDto) {
    return this.eventsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event details with speakers and topics' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post(':id/attend')
  @ApiOperation({ summary: 'Register for an event' })
  attend(
    @Param('id') id: string,
    @CurrentUser('doctorId') doctorId: string,
  ) {
    return this.eventsService.attend(id, doctorId);
  }

  @Delete(':id/attend')
  @ApiOperation({ summary: 'Cancel event registration' })
  unattend(
    @Param('id') id: string,
    @CurrentUser('doctorId') doctorId: string,
  ) {
    return this.eventsService.unattend(id, doctorId);
  }

  @Get(':id/attending')
  @ApiOperation({ summary: 'Check if current user is registered for an event' })
  isAttending(
    @Param('id') id: string,
    @CurrentUser('doctorId') doctorId: string,
  ) {
    return this.eventsService.isAttending(id, doctorId);
  }
}
