import { Test } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { TaskStatus } from './task.entity';
import { NotFoundException } from '@nestjs/common';
import { User } from '../auth/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { getRepositoryToken } from '@nestjs/typeorm'; // Import getRepositoryToken

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
};

const mockTaskRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
});

const mockUser: User = {
  id: 'someUserId',
  username: 'testuser',
  password: 'somehashedpassword',
  tasks: [],
};

describe('TasksService', () => {
  let tasksService: TasksService;
  let tasksRepository: MockType<Repository<Task>>;

  type MockType<T> = {
    [P in keyof T]: jest.Mock<{}>;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task), // Use getRepositoryToken for TypeORM repository
          useFactory: mockTaskRepository,
        },
      ],
    }).compile();

    tasksService = module.get<TasksService>(TasksService);
    tasksRepository = module.get<MockType<Repository<Task>>>(getRepositoryToken(Task));
  });

  it('should be defined', () => {
    expect(tasksService).toBeDefined();
  });

  describe('getTasks', () => {
    it('calls tasksRepository.getTasks and returns the result', async () => {
      const mockTasks = ['someTasks']; // Define mockTasks here
      mockQueryBuilder.getMany.mockResolvedValue(mockTasks);
      const filterDto: GetTasksFilterDto = { status: TaskStatus.IN_PROGRESS, search: 'some search' };
      const result = await tasksService.getTasks(filterDto, mockUser);
      expect(tasksRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual(mockTasks);
    });
  });

  describe('getTaskById', () => {
    it('calls tasksRepository.findOne and returns the task', async () => {
      const mockTask: Task = { id: 'someId', title: 'Test task', description: 'Test desc', status: TaskStatus.OPEN, user: mockUser, userId: mockUser.id };
      tasksRepository.findOne.mockResolvedValue(mockTask);

      const result = await tasksService.getTaskById('someId', mockUser);
      expect(result).toEqual(mockTask);
    });

    it('throws an error if task is not found', async () => {
      tasksRepository.findOne.mockResolvedValue(null);
      await expect(tasksService.getTaskById('someId', mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTask', () => {
    it('calls tasksRepository.create and returns the created task', async () => {
      const createTaskDto: CreateTaskDto = { title: 'Test task', description: 'Test desc' };
      const mockTask: Task = { id: 'someId', title: 'Test task', description: 'Test desc', status: TaskStatus.OPEN, user: mockUser, userId: mockUser.id };

      tasksRepository.create.mockReturnValue(mockTask);
      tasksRepository.save.mockResolvedValue(mockTask);

      const result = await tasksService.createTask(createTaskDto, mockUser);
      expect(tasksRepository.create).toHaveBeenCalledWith({
        title: 'Test task',
        description: 'Test desc',
        status: TaskStatus.OPEN,
        user: mockUser,
        userId: mockUser.id,
      });
      expect(tasksRepository.save).toHaveBeenCalledWith(mockTask);
      expect(result).toEqual(mockTask);
    });
  });

  describe('deleteTask', () => {
    it('calls tasksRepository.delete to delete a task', async () => {
      tasksRepository.delete.mockResolvedValue({ affected: 1 });
      await tasksService.deleteTask('someId', mockUser);
      expect(tasksRepository.delete).toHaveBeenCalledWith({ id: 'someId', userId: mockUser.id });
    });

    it('throws an error if task is not found', async () => {
      tasksRepository.delete.mockResolvedValue({ affected: 0 });
      await expect(tasksService.deleteTask('someId', mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTaskStatus', () => {
    it('updates a task status', async () => {
      const mockTask: Task = { id: 'someId', title: 'Test task', description: 'Test desc', status: TaskStatus.OPEN, user: mockUser, userId: mockUser.id };
      tasksService.getTaskById = jest.fn().mockResolvedValue(mockTask); // Mock getTaskById directly

      const result = await tasksService.updateTaskStatus('someId', TaskStatus.DONE, mockUser);
      expect(tasksService.getTaskById).toHaveBeenCalledWith('someId', mockUser);
      expect(tasksRepository.save).toHaveBeenCalledWith({ ...mockTask, status: TaskStatus.DONE });
      expect(result.status).toEqual(TaskStatus.DONE);
    });

    it('throws an error if task is not found', async () => {
      tasksService.getTaskById = jest.fn().mockRejectedValue(new NotFoundException()); // Mock getTaskById to throw NotFound
      await expect(tasksService.updateTaskStatus('someId', TaskStatus.DONE, mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
