// ─── Users ────────────────────────────────────────────────────────────────────

export const VALID_USER = {
  name: 'Alice Tester',
  email: 'alice@jobsphere.test',
  password: 'Test@Secure123',
  location: 'New York',
};

export const VALID_USER_2 = {
  name: 'Bob Developer',
  email: 'bob@jobsphere.test',
  password: 'Bob@Secure456',
  location: 'San Francisco',
};

export const USER_MISSING_NAME = {
  email: 'noname@jobsphere.test',
  password: 'Test@123',
};

export const USER_MISSING_EMAIL = {
  name: 'No Email',
  password: 'Test@123',
};

export const USER_MISSING_PASSWORD = {
  name: 'No Pass',
  email: 'nopass@jobsphere.test',
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const VALID_JOB = {
  company: 'TechCorp',
  position: 'Software Engineer',
  status: 'pending',
  jobType: 'full-time',
  workLocation: 'New York',
  description:
    'Looking for a skilled engineer with 3+ years Node.js, React, and MongoDB. Must know Docker and CI/CD pipelines.',
};

export const VALID_JOB_2 = {
  company: 'AlphaSoft',
  position: 'Backend Developer',
  status: 'pending',
  jobType: 'remote',
  workLocation: 'Remote',
  description: 'Backend developer with Python and AWS experience needed.',
};

export const VALID_JOB_INTERVIEW = {
  company: 'StartupXYZ',
  position: 'Full Stack Developer',
  status: 'interview',
  jobType: 'remote',
  workLocation: 'Remote',
  description:
    'Full stack developer role requiring React, Node.js, Express, and AWS experience.',
  interviewDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
  interviewTime: '10:00',
  interviewType: 'video',
  interviewRound: 1,
  interviewStatus: 'scheduled',
  interviewerName: 'Jane Smith',
};

export const VALID_JOB_OFFER = {
  company: 'BigTech Inc',
  position: 'Senior Engineer',
  status: 'offer',
  jobType: 'full-time',
  workLocation: 'San Francisco',
  description: 'Senior engineer with 5+ years full stack experience.',
};

export const VALID_JOB_DECLINED = {
  company: 'OtherCorp',
  position: 'Junior Developer',
  status: 'declined',
  jobType: 'part-time',
  workLocation: 'Chicago',
  description: 'Junior developer position — rejected after screening.',
};

export const JOB_MISSING_COMPANY = {
  position: 'Engineer',
  workLocation: 'Remote',
  description: 'Some description.',
};

export const JOB_MISSING_POSITION = {
  company: 'SomeCorp',
  workLocation: 'Remote',
  description: 'Some description.',
};

// ─── Notes ────────────────────────────────────────────────────────────────────

export const VALID_NOTE = {
  text: 'Applied via LinkedIn. Recruiter was very responsive. 2nd round likely.',
};

export const UPDATED_NOTE = {
  text: 'Updated: confirmed technical interview on Friday at 10 AM.',
};

// ─── AI ───────────────────────────────────────────────────────────────────────

export const VALID_RESUME_TEXT = `
John Doe — Software Engineer
Email: john@example.com

Technical Skills:
JavaScript, TypeScript, Node.js, React, MongoDB, Docker, AWS, Express.js, Redis

Professional Experience:
Senior Developer at TechStartup (3 years)
- Built and maintained REST APIs with Express.js and Node.js
- Developed React frontends integrated with Redux state management
- Deployed microservices using Docker and Kubernetes on AWS ECS
- Implemented CI/CD pipelines with GitHub Actions

Education:
B.S. Computer Science — State University, 2019
`;

export const GEMINI_SUMMARIZE_RAW_RESPONSE = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              keySkills: ['Node.js', 'React', 'MongoDB', 'Docker', 'CI/CD'],
              responsibilities: [
                'Build REST APIs',
                'Develop React components',
                'Manage MongoDB databases',
                'Deploy with Docker',
                'Write tests',
              ],
              experience: '3+ years',
              techStack: ['Node.js', 'React', 'MongoDB', 'Docker'],
            }),
          },
        ],
      },
    },
  ],
};

export const GEMINI_MATCH_RAW_RESPONSE = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              matchScore: 85,
              missingSkills: ['Kubernetes', 'GraphQL'],
              strengthAreas: ['Node.js expertise', 'React experience'],
              improvementSuggestions: [
                'Learn Kubernetes for container orchestration',
                'Add GraphQL API experience to resume',
              ],
            }),
          },
        ],
      },
    },
  ],
};
