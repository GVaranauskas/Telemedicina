import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConnectionService } from './connection.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Connections')
@Controller('connections')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  // ─── Connection Requests ────────────────────────────────────

  @Post('request/:receiverId')
  @ApiOperation({ summary: 'Send connection request' })
  async sendRequest(
    @CurrentUser('doctorId') doctorId: string,
    @Param('receiverId') receiverId: string,
  ) {
    return this.connectionService.sendConnectionRequest(doctorId, receiverId);
  }

  @Post('accept/:requestId')
  @ApiOperation({ summary: 'Accept connection request' })
  async acceptRequest(
    @CurrentUser('doctorId') doctorId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.connectionService.acceptConnectionRequest(requestId, doctorId);
  }

  @Post('reject/:requestId')
  @ApiOperation({ summary: 'Reject connection request' })
  async rejectRequest(
    @CurrentUser('doctorId') doctorId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.connectionService.rejectConnectionRequest(requestId, doctorId);
  }

  @Delete(':otherDoctorId')
  @ApiOperation({ summary: 'Remove connection' })
  async removeConnection(
    @CurrentUser('doctorId') doctorId: string,
    @Param('otherDoctorId') otherDoctorId: string,
  ) {
    return this.connectionService.removeConnection(doctorId, otherDoctorId);
  }

  // ─── Follow / Unfollow ─────────────────────────────────────

  @Post('follow/:targetId')
  @ApiOperation({ summary: 'Follow a doctor' })
  async follow(
    @CurrentUser('doctorId') doctorId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.connectionService.follow(doctorId, targetId);
  }

  @Delete('follow/:targetId')
  @ApiOperation({ summary: 'Unfollow a doctor' })
  async unfollow(
    @CurrentUser('doctorId') doctorId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.connectionService.unfollow(doctorId, targetId);
  }

  // ─── Lists ─────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get my connections' })
  async getMyConnections(@CurrentUser('doctorId') doctorId: string) {
    return this.connectionService.getMyConnections(doctorId);
  }

  @Get('followers')
  @ApiOperation({ summary: 'Get my followers' })
  async getMyFollowers(@CurrentUser('doctorId') doctorId: string) {
    return this.connectionService.getMyFollowers(doctorId);
  }

  @Get('following')
  @ApiOperation({ summary: 'Get who I follow' })
  async getMyFollowing(@CurrentUser('doctorId') doctorId: string) {
    return this.connectionService.getMyFollowing(doctorId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending connection requests' })
  async getPending(@CurrentUser('doctorId') doctorId: string) {
    return this.connectionService.getPendingRequests(doctorId);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get connection suggestions (graph-powered)' })
  async getSuggestions(
    @CurrentUser('doctorId') doctorId: string,
    @Query('limit') limit?: number,
  ) {
    return this.connectionService.getSuggestions(
      doctorId,
      limit ? Number(limit) : 10,
    );
  }

  // ─── Endorsements ──────────────────────────────────────────

  @Post('endorse/:targetDoctorId/:skillName')
  @ApiOperation({ summary: 'Endorse a skill of another doctor' })
  async endorse(
    @CurrentUser('doctorId') doctorId: string,
    @Param('targetDoctorId') targetDoctorId: string,
    @Param('skillName') skillName: string,
  ) {
    return this.connectionService.endorseSkill(
      doctorId,
      targetDoctorId,
      skillName,
    );
  }

  @Get('endorsements/:doctorId')
  @ApiOperation({ summary: 'Get endorsements for a doctor' })
  async getEndorsements(@Param('doctorId') doctorId: string) {
    return this.connectionService.getEndorsements(doctorId);
  }
}
