/**
 * Unit Tests — Job Controller
 * All DB interactions are mocked. Tests pure logic of each controller function.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

vi.mock('../../../services/jobs/src/models/Job.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndDelete: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

// pdf-parse needed by jobController via createRequire
vi.mock('pdf-parse', () => ({ default: vi.fn() }));

import Job from '../../../services/jobs/src/models/Job.js';
import {
  createJob,
  getAllJobs,
  getJob,
  updateJob,
  deleteJob,
  addNote,
  deleteNote,
  updateNote,
  showStats,
} from '../../../services/jobs/src/controllers/jobController.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const userId = 'uid-001';
const jobId = new mongoose.Types.ObjectId().toString();

const fakeJob = () => ({
  _id: jobId,
  company: 'TechCorp',
  position: 'Engineer',
  status: 'pending',
  jobType: 'full-time',
  workLocation: 'NY',
  description: 'A great job.',
  notes: [],
  createdBy: userId,
  save: vi.fn().mockResolvedValue(true),
});

// ─── createJob ────────────────────────────────────────────────────────────────

describe('Job Controller — createJob()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 201 with the created job', async () => {
    const job = fakeJob();
    Job.create.mockResolvedValue(job);

    const req = {
      body: {
        company: 'TechCorp',
        position: 'Engineer',
        workLocation: 'NY',
        description: 'Great job.',
      },
      user: { userId },
    };
    const res = mockRes();

    await createJob(req, res);

    expect(Job.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ job });
  });

  it('returns 400 when required fields are missing', async () => {
    const req = {
      body: { company: 'TechCorp' }, // missing position and workLocation
      user: { userId },
    };
    const res = mockRes();

    await createJob(req, res);

    expect(Job.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'All fields are required' });
  });
});

// ─── getAllJobs ───────────────────────────────────────────────────────────────

describe('Job Controller — getAllJobs()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated job list with metadata', async () => {
    const jobs = [fakeJob(), fakeJob()];

    // Job.find() returns a chainable query object
    const chainable = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(jobs),
    };
    Job.find.mockReturnValue(chainable);
    Job.countDocuments.mockResolvedValue(12);

    const req = {
      query: { page: '1', limit: '6' },
      user: { userId },
    };
    const res = mockRes();

    await getAllJobs(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('jobs');
    expect(body).toHaveProperty('totalJobs', 12);
    expect(body).toHaveProperty('numOfPages', 2);
    expect(body).toHaveProperty('currentPage', '1');
  });

  it('filters by status when provided', async () => {
    const chainable = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    Job.find.mockReturnValue(chainable);
    Job.countDocuments.mockResolvedValue(0);

    const req = {
      query: { status: 'interview', page: '1', limit: '6' },
      user: { userId },
    };
    const res = mockRes();

    await getAllJobs(req, res);

    const queryArg = Job.find.mock.calls[0][0];
    expect(queryArg).toHaveProperty('status', 'interview');
  });

  it('applies case-insensitive search on position and company', async () => {
    const chainable = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    Job.find.mockReturnValue(chainable);
    Job.countDocuments.mockResolvedValue(0);

    const req = {
      query: { search: 'react', page: '1', limit: '6' },
      user: { userId },
    };
    const res = mockRes();

    await getAllJobs(req, res);

    const queryArg = Job.find.mock.calls[0][0];
    expect(queryArg).toHaveProperty('$or');
    expect(queryArg.$or[0].position.$options).toBe('i');
  });

  it('returns 500 on DB error', async () => {
    Job.find.mockImplementation(() => {
      throw new Error('DB error');
    });

    const req = { query: {}, user: { userId } };
    const res = mockRes();

    await getAllJobs(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── getJob ───────────────────────────────────────────────────────────────────

describe('Job Controller — getJob()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the job when found', async () => {
    const job = fakeJob();
    Job.findOne.mockResolvedValue(job);

    const req = { params: { id: jobId }, user: { userId } };
    const res = mockRes();

    await getJob(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ job });
  });

  it('returns 404 when job is not found', async () => {
    Job.findOne.mockResolvedValue(null);

    const req = { params: { id: jobId }, user: { userId } };
    const res = mockRes();

    await getJob(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Job not found' });
  });
});

// ─── updateJob ────────────────────────────────────────────────────────────────

describe('Job Controller — updateJob()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates and returns 200 with the updated job', async () => {
    const job = fakeJob();
    Job.findOne.mockResolvedValue(job);

    const req = {
      params: { id: jobId },
      body: { status: 'interview' },
      user: { userId },
    };
    const res = mockRes();

    await updateJob(req, res);

    expect(job.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when job belongs to another user', async () => {
    Job.findOne.mockResolvedValue(null); // findOne with wrong userId returns null

    const req = {
      params: { id: jobId },
      body: { status: 'offer' },
      user: { userId: 'other-user-id' },
    };
    const res = mockRes();

    await updateJob(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ─── deleteJob ────────────────────────────────────────────────────────────────

describe('Job Controller — deleteJob()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes and returns 200 with success message', async () => {
    Job.findOneAndDelete.mockResolvedValue(fakeJob());

    const req = { params: { id: jobId }, user: { userId } };
    const res = mockRes();

    await deleteJob(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Job deleted successfully' });
  });

  it('returns 404 when job does not exist', async () => {
    Job.findOneAndDelete.mockResolvedValue(null);

    const req = { params: { id: jobId }, user: { userId } };
    const res = mockRes();

    await deleteJob(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Job not found' });
  });
});

// ─── addNote / deleteNote / updateNote ────────────────────────────────────────

describe('Job Controller — Notes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('addNote returns 200 with note added', async () => {
    const job = fakeJob();
    job.notes = { push: vi.fn() };
    Job.findOne.mockResolvedValue(job);

    const req = {
      params: { id: jobId },
      body: { text: 'Great interview feedback.' },
      user: { userId },
    };
    const res = mockRes();

    await addNote(req, res);

    expect(job.notes.push).toHaveBeenCalledWith({ text: 'Great interview feedback.' });
    expect(job.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('addNote returns 400 when text is missing', async () => {
    const req = {
      params: { id: jobId },
      body: {},
      user: { userId },
    };
    const res = mockRes();

    await addNote(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Note text is required' });
  });

  it('deleteNote returns 200 after filtering notes', async () => {
    const noteId = 'note-id-abc';
    const job = fakeJob();
    job.notes = [{ _id: { toString: () => noteId }, text: 'Old note' }];
    Job.findOne.mockResolvedValue(job);

    const req = {
      params: { jobId, noteId },
      user: { userId },
    };
    const res = mockRes();

    await deleteNote(req, res);

    expect(job.notes).toHaveLength(0);
    expect(job.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('updateNote returns 200 after changing note text', async () => {
    const noteId = 'note-id-xyz';
    const fakeNote = { text: 'Old text' };
    const job = fakeJob();
    job.notes = { id: vi.fn().mockReturnValue(fakeNote) };
    Job.findOne.mockResolvedValue(job);

    const req = {
      params: { jobId, noteId },
      body: { text: 'Updated note text' },
      user: { userId },
    };
    const res = mockRes();

    await updateNote(req, res);

    expect(fakeNote.text).toBe('Updated note text');
    expect(job.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('updateNote returns 400 when text is empty', async () => {
    const req = {
      params: { jobId, noteId: 'nid' },
      body: { text: '   ' },
      user: { userId },
    };
    const res = mockRes();

    await updateNote(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── showStats ────────────────────────────────────────────────────────────────

describe('Job Controller — showStats()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns defaultStats and monthlyApplications', async () => {
    Job.aggregate
      .mockResolvedValueOnce([
        { _id: 'pending', count: 5 },
        { _id: 'interview', count: 2 },
        { _id: 'offer', count: 1 },
      ])
      .mockResolvedValueOnce([
        { _id: { year: 2025, month: 3 }, count: 4 },
        { _id: { year: 2025, month: 2 }, count: 3 },
      ]);

    const req = { user: { userId } };
    const res = mockRes();

    await showStats(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.defaultStats).toMatchObject({ pending: 5, interview: 2, offer: 1, declined: 0 });
    expect(Array.isArray(body.monthlyApplications)).toBe(true);
  });
});
