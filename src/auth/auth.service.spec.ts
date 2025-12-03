import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs'; // Import bcryptjs
import { getRepositoryToken } from '@nestjs/typeorm'; // Import getRepositoryToken

// Mocking bcryptjs module
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('someSalt'),
  hash: jest.fn().mockResolvedValue('testpasswordhash'),
  compare: jest.fn(), // Mock compare separately as it can return true/false
}));

const mockUsersRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn(),
});

describe('AuthService', () => {
  let authService: AuthService;
  let usersRepository: MockType<Repository<User>>;
  let jwtService: MockType<JwtService>;

  type MockType<T> = {
    [P in keyof T]: jest.Mock<{}>;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User), // Use getRepositoryToken for TypeORM repository
          useFactory: mockUsersRepository,
        },
        { provide: JwtService, useFactory: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersRepository = module.get<MockType<Repository<User>>>(getRepositoryToken(User));
    jwtService = module.get<MockType<JwtService>>(JwtService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('successfully registers a user', async () => {
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('someSalt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('testpasswordhash');
      usersRepository.create.mockReturnValueOnce({ username: 'testuser' } as User);
      usersRepository.save.mockResolvedValueOnce(undefined);

      const authCredentialsDto: AuthCredentialsDto = { username: 'testuser', password: 'testpassword' };
      await expect(authService.signUp(authCredentialsDto)).resolves.not.toThrow();
      expect(usersRepository.create).toHaveBeenCalledWith({ username: 'testuser', password: 'testpasswordhash' });
      expect(usersRepository.save).toHaveBeenCalled();
    });

    it('throws a conflict exception if username already exists', async () => {
      usersRepository.create.mockReturnValueOnce({ username: 'testuser' } as User);
      usersRepository.save.mockRejectedValueOnce({ code: '23505' }); // PostgreSQL duplicate key error code

      const authCredentialsDto: AuthCredentialsDto = { username: 'testuser', password: 'testpassword' };
      await expect(authService.signUp(authCredentialsDto)).rejects.toThrow(ConflictException);
    });

    it('throws an internal server error for other errors', async () => {
      usersRepository.create.mockReturnValueOnce({ username: 'testuser' } as User);
      usersRepository.save.mockRejectedValueOnce({ code: 'some_other_error' });

      const authCredentialsDto: AuthCredentialsDto = { username: 'testuser', password: 'testpassword' };
      await expect(authService.signUp(authCredentialsDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('signIn', () => {
    let mockUser: User;

    beforeEach(() => {
      mockUser = { id: 'someid', username: 'testuser', password: 'testpasswordhash', tasks: [] };
      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    it('returns an accessToken on successful sign-in', async () => {
      jwtService.sign.mockResolvedValueOnce('mockAccessToken');

      const authCredentialsDto: AuthCredentialsDto = { username: 'testuser', password: 'testpassword' };
      const result = await authService.signIn(authCredentialsDto);

      expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { username: 'testuser' } });
      expect(bcrypt.compare).toHaveBeenCalledWith('testpassword', 'testpasswordhash');
      expect(jwtService.sign).toHaveBeenCalledWith({ username: 'testuser' });
      expect(result).toEqual({ accessToken: 'mockAccessToken' });
    });

    it('throws an unauthorized exception for invalid credentials (user not found)', async () => {
      usersRepository.findOne.mockResolvedValue(null); // User not found
      const authCredentialsDto: AuthCredentialsDto = { username: 'testuser', password: 'wrongpassword' };
      await expect(authService.signIn(authCredentialsDto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws an unauthorized exception for wrong password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Mock bcrypt.compare specifically for this test to return false

      const authCredentialsDto: AuthCredentialsDto = { username: 'testuser', password: 'wrongpassword' };
      await expect(authService.signIn(authCredentialsDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
