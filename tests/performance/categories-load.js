import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:5000/api';

export const options = {
  vus: 5,
  duration: '10s',
};

export default function () {
  const res = http.get(`${baseUrl}/categories?isActive=true&page=1&limit=5`);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
