import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BcryptHashingService } from './hashing/bcrypt-hashing.service';
import { HashingService } from './hashing/hashing.service';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [
    UsersService,
    { provide: HashingService, useClass: BcryptHashingService },
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
