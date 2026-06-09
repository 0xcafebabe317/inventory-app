import http from './request'

export function uploadInvoice(file: File, type: 'purchase' | 'sale') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)
  // 必须显式清除 Content-Type，让浏览器自动设置 multipart/form-data + boundary
  // 否则 axios 实例默认的 application/json 会触发 transformRequest 把 FormData 转成 JSON
  return http.post('/api/upload/invoice', formData, {
    headers: { 'Content-Type': undefined as any }
  })
}
