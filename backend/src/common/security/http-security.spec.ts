import { requestLimits } from './http-security';

describe('login rate limits', () => {
  it('shares the login limit across case and trailing-slash route variants', () => {
    const middleware = requestLimits();
    const next = jest.fn();
    const response = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const paths = ['/api/v1/auth/login', '/api/v1/auth/login/', '/api/v1/AUTH/LOGIN'];
    for (let i = 0; i < 21; i++) {
      middleware({ path: paths[i % paths.length], ip: '127.0.0.1', body: { email: 'user@example.test' } } as any, response as any, next);
    }
    expect(next).toHaveBeenCalledTimes(20);
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });
});
