import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashingService } from './hashing/hashing.service';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly hashingService: HashingService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existing = await this.userModel
      .findOne({ email: createUserDto.email })
      .exec();
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const hashedPassword = await this.hashingService.hash(
      createUserDto.password,
    );
    const created = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return created.save();
  }

  findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<UserDocument> {
    this.assertValidId(id);
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    this.assertValidId(id);

    if (updateUserDto.email) {
      const existing = await this.userModel
        .findOne({ email: updateUserDto.email, _id: { $ne: id } })
        .exec();
      if (existing) {
        throw new ConflictException('Email is already in use');
      }
    }

    const update: Partial<User> = { ...updateUserDto };
    if (updateUserDto.password) {
      update.password = await this.hashingService.hash(updateUserDto.password);
    }

    const updated = await this.userModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.assertValidId(id);
    const deleted = await this.userModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`User ${id} not found`);
    }
  }

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  findByIdWithRefreshToken(id: string): Promise<UserDocument | null> {
    if (!isValidObjectId(id)) {
      return Promise.resolve(null);
    }
    return this.userModel.findById(id).select('+hashedRefreshToken').exec();
  }

  async setRefreshTokenHash(
    id: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { hashedRefreshToken }).exec();
  }

  private assertValidId(id: string): void {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid user id: ${id}`);
    }
  }
}
