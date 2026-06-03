import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/auth/Login.vue') },
  {
    path: '/',
    component: () => import('../layouts/TabLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/tabbar/Dashboard.vue') },
      { path: 'products', name: 'Products', component: () => import('../views/tabbar/Products.vue') },
      { path: 'sales', name: 'Sales', component: () => import('../views/tabbar/Sales.vue') },
      { path: 'more', name: 'More', component: () => import('../views/tabbar/More.vue') }
    ]
  },
  { path: '/product-form/:id?', name: 'ProductForm', component: () => import('../views/ProductForm.vue') },
  { path: '/sale-detail/:id', name: 'SaleDetail', component: () => import('../views/SaleDetail.vue') },
  { path: '/purchase-detail/:id', name: 'PurchaseDetail', component: () => import('../views/PurchaseDetail.vue') },
  { path: '/customer-detail/:id', name: 'CustomerDetail', component: () => import('../views/CustomerDetail.vue') },
  { path: '/user-detail/:id', name: 'UserDetail', component: () => import('../views/UserDetail.vue') },
  { path: '/stock-log/:id', name: 'StockLog', component: () => import('../views/StockLog.vue') },
  { path: '/reports', name: 'Reports', component: () => import('../views/Reports.vue') },
  { path: '/users', name: 'Users', component: () => import('../views/Users.vue') },
  { path: '/customers', name: 'Customers', component: () => import('../views/Customers.vue') },
  { path: '/logs', name: 'Logs', component: () => import('../views/Logs.vue') }
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to, _from, next) => {
  if (to.path === '/login') {
    next()
    return
  }
  const token = localStorage.getItem('admin_token')
  if (!token) {
    next('/login')
    return
  }
  next()
})

export default router
