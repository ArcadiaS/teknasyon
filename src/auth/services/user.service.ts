import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Repository, UpdateResult } from 'typeorm';
import { FriendRequestEntity } from '../models/friend-request.entity';
import {
  FriendRequest,
  FriendRequestStatus,
  FriendRequest_Status,
} from '../models/friend-request.interface';
import { UserEntity } from '../models/user.entity';
import { User } from '../models/user.class';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(FriendRequestEntity)
    private readonly friendRequestRepository: Repository<FriendRequestEntity>,
  ) {}

  findUserById(id: number): Observable<User> {
    return from(
      this.userRepository.findOne({
        where: {
          id,
        },
      }),
    ).pipe(
      map((user: User) => {
        if (!user) {
          throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }
        delete user.password;
        return user;
      }),
    );
  }

  hasRequestBeenSentOrReceived(
    creator: User,
    receiver: User,
  ): Observable<boolean> {
    return from(
      this.friendRequestRepository.findOne({
        where: [
          { creator, receiver },
          { creator: receiver, receiver: creator },
        ],
      }),
    ).pipe(
      switchMap((friendRequest: FriendRequest) => {
        if (!friendRequest) return of(false);
        return of(true);
      }),
    );
  }

  sendFriendRequest(
    receiverId: number,
    creator: User,
  ): Observable<FriendRequest | { error: string }> {
    if (receiverId === creator.id) return of({ error: 'Error' });

    return this.findUserById(receiverId).pipe(
      switchMap((receiver: User) => {
        return this.hasRequestBeenSentOrReceived(creator, receiver).pipe(
          switchMap((hasRequestBeenSentOrReceived: boolean) => {
            if (hasRequestBeenSentOrReceived)
              return of({
                error: 'A friend request already sent.',
              });
            const friendRequest: FriendRequest = {
              creator,
              receiver,
              status: 'pending',
            };
            return from(this.friendRequestRepository.save(friendRequest));
          }),
        );
      }),
    );
  }

  getFriendRequestStatus(
    receiverId: number,
    currentUser: User,
  ): Observable<FriendRequestStatus> {
    return this.findUserById(receiverId).pipe(
      switchMap((receiver: User) => {
        return from(
          this.friendRequestRepository.findOne({
            where: [
              { creator: currentUser, receiver: receiver },
              { creator: receiver, receiver: currentUser },
            ],
            relations: ['creator', 'receiver'],
          }),
        );
      }),
      switchMap((friendRequest: FriendRequest) => {
        if (friendRequest?.receiver.id === currentUser.id) {
          return of({
            status: 'waiting-for-current-user-response' as FriendRequest_Status,
          });
        }
        return of({ status: friendRequest?.status || 'not-sent' });
      }),
    );
  }

  getFriendRequestUserById(friendRequestId: number): Observable<FriendRequest> {
    return from(
      this.friendRequestRepository.findOne({
        where: [{ id: friendRequestId }],
      }),
    );
  }

  respondToFriendRequest(
    statusResponse: FriendRequest_Status,
    friendRequestId: number,
  ): Observable<FriendRequestStatus> {
    return this.getFriendRequestUserById(friendRequestId).pipe(
      switchMap((friendRequest: FriendRequest) => {
        return from(
          this.friendRequestRepository.save({
            ...friendRequest,
            status: statusResponse,
          }),
        );
      }),
    );
  }

  getFriendRequestsFromRecipients(
    currentUser: User,
  ): Observable<FriendRequest[]> {
    return from(
      this.friendRequestRepository.find({
        where: [{ receiver: currentUser }],
        relations: ['receiver', 'creator'],
      }),
    );
  }

  getFriends(currentUser: User): Observable<User[]> {
    return from(
      this.friendRequestRepository.find({
        where: [
          { creator: currentUser, status: 'accepted' },
          { receiver: currentUser, status: 'accepted' },
        ],
        relations: ['creator', 'receiver'],
      }),
    ).pipe(
      switchMap((friends: FriendRequest[]) => {
        const userIds: number[] = [];

        friends.forEach((friend: FriendRequest) => {
          if (friend.creator.id === currentUser.id) {
            userIds.push(friend.receiver.id);
          } else if (friend.receiver.id === currentUser.id) {
            userIds.push(friend.creator.id);
          }
        });

        return from(this.userRepository.findByIds(userIds));
      }),
    );
  }
}
