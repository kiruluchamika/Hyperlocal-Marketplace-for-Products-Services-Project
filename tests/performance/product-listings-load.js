import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:5000/api';

export const options = {
  vus: 10,
  duration: '10s',
};

export default function () {
  const res = http.get(`${baseUrl}/listings?page=1&limit=5`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response success is true': (r) => r.json('success') === true,
    'response data is an array': (r) => Array.isArray(r.json('data')),
    'pagination page is 1': (r) => r.json('pagination.page') === 1,
  });

  sleep(1);
}
