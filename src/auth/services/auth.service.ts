import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import { from, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { UserEntity } from '../models/user.entity';
import { User } from '../models/user.class';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  doesUserExist(email: string): Observable<boolean> {
    return from(this.userRepository.findOne({ where: { email } })).pipe(
      switchMap((user: User) => {
        return of(!!user);
      }),
    );
  }

  registerAccount(user: User): Observable<User> {
    const { firstName, lastName, email, password } = user;

    return this.doesUserExist(email).pipe(
      tap((doesUserExist: boolean) => {
        if (doesUserExist)
          throw new HttpException(
            'Error user already exists.',
            HttpStatus.BAD_REQUEST,
          );
      }),
      switchMap(() => {
        return from(
          this.userRepository.save({
            firstName,
            lastName,
            email,
            password,
          }),
        ).pipe(
          map((user: User) => {
            delete user.password;
            return user;
          }),
        );
      }),
    );
  }

  validateUser(email: string, password: string): Observable<User> {
    return from(this.userRepository.findOne({ where: { email, password } }));
  }

  login(user: User): Observable<any> {
    const { email, password } = user;
    return this.validateUser(email, password).pipe(
      switchMap((user: User) => {
        if (user) {
          // create JWT - credentials
          return from(this.jwtService.signAsync({ user }));
        }
      }),
    );
  }

  getJwtUser(jwt: string): Observable<User | null> {
    return from(this.jwtService.verifyAsync(jwt)).pipe(
      map(({ user }: { user: User }) => {
        return user;
      }),
      catchError(() => {
        return of(null);
      }),
    );
  }
}
