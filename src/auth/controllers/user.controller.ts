import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Param,
  Put,
  Body,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtGuard } from '../guards/jwt.guard';
import {
  FriendRequest,
  FriendRequestStatus,
} from '../models/friend-request.interface';
import { User } from '../models/user.class';
import { UserService } from '../services/user.service';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtGuard)
  @Get(':userId')
  findUserById(@Param('userId') userStringId: string): Observable<User> {
    const userId = parseInt(userStringId);
    return this.userService.findUserById(userId);
  }

  @UseGuards(JwtGuard)
  @Post('friend-request/send/:receiverId')
  sendFriendRequest(
    @Param('receiverId') receiverStringId: string,
    @Request() req,
  ): Observable<FriendRequest | { error: string }> {
    const receiverId = parseInt(receiverStringId);
    return this.userService.sendFriendRequest(receiverId, req.user);
  }

  @UseGuards(JwtGuard)
  @Get('friend-request/status/:receiverId')
  getFriendRequestStatus(
    @Param('receiverId') receiverStringId: string,
    @Request() req,
  ): Observable<FriendRequestStatus> {
    const receiverId = parseInt(receiverStringId);
    return this.userService.getFriendRequestStatus(receiverId, req.user);
  }

  @UseGuards(JwtGuard)
  @Put('friend-request/response/:friendRequestId')
  respondToFriendRequest(
    @Param('friendRequestId') friendRequestStringId: string,
    @Body() statusResponse: FriendRequestStatus,
  ): Observable<FriendRequestStatus> {
    const friendRequestId = parseInt(friendRequestStringId);
    return this.userService.respondToFriendRequest(
      statusResponse.status,
      friendRequestId,
    );
  }

  @UseGuards(JwtGuard)
  @Get('friend-request/me/received-requests')
  getFriendRequestsFromRecipients(
    @Request() req,
  ): Observable<FriendRequestStatus[]> {
    return this.userService.getFriendRequestsFromRecipients(req.user);
  }

  @UseGuards(JwtGuard)
  @Get('friends/my')
  getFriends(@Request() req): Observable<User[]> {
    return this.userService.getFriends(req.user);
  }
}
