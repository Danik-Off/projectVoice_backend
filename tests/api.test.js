const request = require('supertest');

const app = require('../index');

describe('API Health Check', () => {
    test('GET /api-docs should return Swagger documentation', async () => {
        const response = await request(app).get('/api-docs').expect(200);

        expect(response.text).toContain('swagger');
    });

    test('GET /api/auth/health should return health status', async () => {
        const response = await request(app).get('/api/auth/health').expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
    });
});

describe('Database Connection', () => {
    test('Database should be connected', async () => {
        const { sequelize } = require('../models');

        try {
            await sequelize.authenticate();
            expect(true).toBe(true);
        } catch (error) {
            throw new Error('Database connection failed: ' + error.message);
        }
    });
});

describe('Authentication Endpoints', () => {
    test('POST /api/auth/register should create new user', async () => {
        const userData = {
            username: 'testuser' + Date.now(),
            email: 'test' + Date.now() + '@example.com',
            password: 'testpassword123',
        };

        const response = await request(app).post('/api/auth/register').send(userData).expect(201);

        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
    });

    test('POST /api/auth/login should authenticate user', async () => {
        const loginData = {
            email: 'test@example.com',
            password: 'testpassword123',
        };

        const response = await request(app).post('/api/auth/login').send(loginData).expect(200);

        expect(response.body).toHaveProperty('token');
    });
});

describe('Server Endpoints', () => {
    let authToken;

    beforeAll(async () => {
        // Login to get auth token
        const loginData = {
            email: 'test@example.com',
            password: 'testpassword123',
        };

        const response = await request(app).post('/api/auth/login').send(loginData);

        authToken = response.body.token;
    });

    test('GET /api/servers should return servers list', async () => {
        const response = await request(app)
            .get('/api/servers')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
    });

    test('POST /api/servers should create new server', async () => {
        const serverData = {
            name: 'Test Server ' + Date.now(),
            description: 'Test server description',
        };

        const response = await request(app)
            .post('/api/servers')
            .set('Authorization', `Bearer ${authToken}`)
            .send(serverData)
            .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('name', serverData.name);
    });
});
