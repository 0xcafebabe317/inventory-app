import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/auth/Register.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    component: () => import('../layouts/TabLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/tabbar/Dashboard.vue') },
      { path: 'checkout', name: 'Checkout', component: () => import('../views/tabbar/Checkout.vue') },
      { path: 'inventory', name: 'Inventory', component: () => import('../views/tabbar/Inventory.vue') },
      { path: 'mine', name: 'Mine', component: () => import('../views/tabbar/Mine.vue') },
      { path: 'purchase', name: 'Purchase', component: () => import('../views/Purchase.vue') }
    ]
  },
  {
    path: '/customer-detail/:id',
    name: 'CustomerDetail',
    component: () => import('../views/CustomerDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/product-form/:id?',
    name: 'ProductForm',
    component: () => import('../views/ProductForm.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/stock-log/:id',
    name: 'StockLog',
    component: () => import('../views/StockLog.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/sale-detail/:id',
    name: 'SaleDetail',
    component: () => import('../views/SaleDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/today-sales',
    name: 'TodaySales',
    component: () => import('../views/TodaySales.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/locked',
    name: 'Locked',
    component: () => import('../views/Locked.vue')
  },
  {
    path: '/contact',
    name: 'Contact',
    component: () => import('../views/Contact.vue')
  },
  {
    path: '/supplier-manage',
    name: 'SupplierManage',
    component: () => import('../views/SupplierManage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/customer-manage',
    name: 'CustomerManage',
    component: () => import('../views/CustomerManage.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  // Guest-only pages (login/register): redirect to dashboard if already logged in
  if (to.meta.guest && auth.isLoggedIn) {
    next('/dashboard')
    return
  }

  // Auth-required pages
  if (to.meta.requiresAuth) {
    if (!auth.isLoggedIn) {
      next('/login')
      return
    }
    if (auth.isLocked) {
      next('/locked')
      return
    }
  }

  next()
})

export default router
