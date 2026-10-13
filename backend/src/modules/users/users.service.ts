import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserDto } from '../auth/dto/login.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Only your own account: the id comes from the session, never the client.
  updateMe(userId: string, dto: UpdateMeDto): Promise<UserDto> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { theme: dto.theme },
      select: { id: true, email: true, name: true, theme: true },
    });
  }
}
