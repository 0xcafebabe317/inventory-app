import http from './request'

export function createRepayment(data: any) {
  return http.post('/api/repayments', data)
}
