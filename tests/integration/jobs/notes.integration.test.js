/**
 * Integration Tests — Notes CRUD
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { connect, disconnect, clearDatabase } from '../../utils/testDb.js';
import { VALID_USER, VALID_USER_2, VALID_JOB, VALID_NOTE, UPDATED_NOTE } from '../../utils/mockData.js';

import authRoutes from '../../../services/auth/src/routes/authRoutes.js';
import jobRoutes from '../../../services/jobs/src/routes/jobRoutes.js';

const authApp = express();
authApp.use(express.json());
authApp.use('/api/v1/auth', authRoutes);

const jobsApp = express();
jobsApp.use(express.json());
jobsApp.use('/api/v1/jobs', jobRoutes);

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
afterEach(async () => { await clearDatabase(); });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const setupUser = async (userData = VALID_USER) => {
  await request(authApp).post('/api/v1/auth/register').send(userData);
  const res = await request(authApp)
    .post('/api/v1/auth/login')
    .send({ email: userData.email, password: userData.password });
  return res.body.accessToken;
};

const createJob = async (token) => {
  const res = await request(jobsApp)
    .post('/api/v1/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send(VALID_JOB);
  return res.body.job._id;
};

// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/v1/jobs/:id/notes — Add Note', () => {
  it('adds a note and returns 200 with updated job', async () => {
    const token = await setupUser();
    const jobId = await createJob(token);

    const res = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_NOTE);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Note added successfully');
    expect(res.body.job.notes).toHaveLength(1);
    expect(res.body.job.notes[0].text).toBe(VALID_NOTE.text);
  });

  it('returns 400 when note text is empty', async () => {
    const token = await setupUser();
    const jobId = await createJob(token);

    const res = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Note text is required');
  });

  it('returns 400 when text field is missing', async () => {
    const token = await setupUser();
    const jobId = await createJob(token);

    const res = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 404 when job is not found', async () => {
    const token = await setupUser();

    const res = await request(jobsApp)
      .patch('/api/v1/jobs/000000000000000000000099/notes')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_NOTE);

    expect(res.status).toBe(404);
  });

  it('allows multiple notes on the same job', async () => {
    const token = await setupUser();
    const jobId = await createJob(token);

    await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'First note' });

    const res = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Second note' });

    expect(res.body.job.notes).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/v1/jobs/:jobId/notes/:noteId — Update Note', () => {
  it('updates note text and returns 200', async () => {
    const token = await setupUser();
    const jobId = await createJob(token);

    // Add note first
    const addRes = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_NOTE);

    const noteId = addRes.body.job.notes[0]._id;

    const res = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(UPDATED_NOTE);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Note updated');
    const updatedNote = res.body.job.notes.find((n) => n._id === noteId);
    expect(updatedNote.text).toBe(UPDATED_NOTE.text);
  });

  it('returns 400 when update text is empty/whitespace', async () => {
    const token = await setupUser();
    const jobId = await createJob(token);

    const addRes = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_NOTE);

    const noteId = addRes.body.job.notes[0]._id;

    const res = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: '   ' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when noteId does not exist', async () => {
    const token = await setupUser();
    const jobId = await createJob(token);

    const res = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes/000000000000000000000099`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Update text' });

    expect(res.status).toBe(404);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(jobsApp)
      .patch('/api/v1/jobs/someid/notes/noteid')
      .send({ text: 'Test' });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/v1/jobs/:jobId/notes/:noteId', () => {
  it('deletes the note and returns 200', async () => {
    const token = await setupUser();
    const jobId = await createJob(token);

    const addRes = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_NOTE);

    const noteId = addRes.body.job.notes[0]._id;

    const res = await request(jobsApp)
      .delete(`/api/v1/jobs/${jobId}/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Note deleted');
    expect(res.body.job.notes).toHaveLength(0);
  });

  it('returns 404 when deleting a note on non-existent job', async () => {
    const token = await setupUser();

    const res = await request(jobsApp)
      .delete('/api/v1/jobs/000000000000000000000099/notes/000000000000000000000099')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('cannot delete another user\'s note', async () => {
    const token1 = await setupUser();
    const token2 = await setupUser(VALID_USER_2);
    const jobId = await createJob(token1);

    const addRes = await request(jobsApp)
      .patch(`/api/v1/jobs/${jobId}/notes`)
      .set('Authorization', `Bearer ${token1}`)
      .send(VALID_NOTE);

    const noteId = addRes.body.job.notes[0]._id;

    // User 2 cannot see job of User 1 → 404
    const res = await request(jobsApp)
      .delete(`/api/v1/jobs/${jobId}/notes/${noteId}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(404);
  });
});
