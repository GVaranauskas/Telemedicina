import {
  Controller,
  Post,
  Put,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JobService } from './job.service';
import { CreateJobDto, UpdateJobDto, ApplyJobDto } from './dto/create-job.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @ApiOperation({ summary: 'Create a job listing (institution admin)' })
  async create(
    @CurrentUser('institutionId') institutionId: string,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobService.create(institutionId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a job listing' })
  async update(
    @Param('id') id: string,
    @CurrentUser('institutionId') institutionId: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobService.update(id, institutionId, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search jobs' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'shift', required: false })
  @ApiQuery({ name: 'specialtyId', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'minSalary', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('type') type?: string,
    @Query('shift') shift?: string,
    @Query('specialtyId') specialtyId?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('minSalary') minSalary?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobService.search({
      type,
      shift,
      specialtyId,
      city,
      state,
      minSalary: minSalary ? Number(minSalary) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('recommended')
  @ApiOperation({ summary: 'Get recommended jobs based on your profile (graph-powered)' })
  async getRecommended(
    @CurrentUser('doctorId') doctorId: string,
    @Query('limit') limit?: number,
  ) {
    return this.jobService.getRecommendedJobs(
      doctorId,
      limit ? Number(limit) : 10,
    );
  }

  @Get('my-applications')
  @ApiOperation({ summary: 'Get my job applications' })
  async getMyApplications(@CurrentUser('doctorId') doctorId: string) {
    return this.jobService.getMyApplications(doctorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  async findById(@Param('id') id: string) {
    return this.jobService.findById(id);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply to a job' })
  async apply(
    @Param('id') jobId: string,
    @CurrentUser('doctorId') doctorId: string,
    @Body() dto: ApplyJobDto,
  ) {
    return this.jobService.apply(jobId, doctorId, dto);
  }

  @Get(':id/applications')
  @ApiOperation({ summary: 'Get applications for a job (institution admin)' })
  async getApplications(
    @Param('id') jobId: string,
    @CurrentUser('institutionId') institutionId: string,
  ) {
    return this.jobService.getJobApplications(jobId, institutionId);
  }

  @Patch('applications/:applicationId/status')
  @ApiOperation({ summary: 'Update application status' })
  async updateApplicationStatus(
    @Param('applicationId') applicationId: string,
    @Body('status') status: 'ACCEPTED' | 'REJECTED',
  ) {
    return this.jobService.updateApplicationStatus(applicationId, status);
  }
}
