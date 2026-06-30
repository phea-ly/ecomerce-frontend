<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const api = axios.create({ baseURL: 'http://127.0.0.1:8000/api' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const route = useRoute()
const router = useRouter()
const page = computed(() => String(route.params.page || 'home'))
const id = computed(() => route.params.id)
const token = ref(localStorage.getItem('token'))
const user = ref<any>(null)
const categories = ref<any[]>([])
const products = ref<any[]>([])
const product = ref<any>(null)
const cart = ref<any[]>([])
const wishlist = ref<any[]>([])
const orders = ref<any[]>([])
const message = ref('')
const error = ref('')
const filters = reactive({ search: '', category_id: '' })
const auth = reactive({ name: '', email: '', password: '', password_confirmation: '' })
const checkout = reactive({ customer_name: '', phone: '', address: '' })
const profile = reactive({ name: '', email: '', current_password: '', password: '', password_confirmation: '' })
const review = reactive({ rating: 5, comment: '' })

const total = computed(() => cart.value.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0))

function show(path: string) {
  router.push(path)
}

function money(value: number | string) {
  return `$${Number(value).toFixed(2)}`
}

async function loadPublic() {
  categories.value = (await api.get('/categories')).data
  await loadProducts()
}

async function loadProducts() {
  const { data } = await api.get('/products', { params: filters })
  products.value = data.data || data
}

async function loadProduct() {
  product.value = (await api.get(`/products/${id.value}`)).data
}

async function loadPrivate() {
  if (!token.value) return
  user.value = (await api.get('/profile')).data
  profile.name = user.value.name
  profile.email = user.value.email
  cart.value = (await api.get('/cart')).data
  wishlist.value = (await api.get('/wishlist')).data
  orders.value = (await api.get('/orders')).data
}

async function login(register = false) {
  clear()
  try {
    const { data } = await api.post(register ? '/register' : '/login', auth)
    localStorage.setItem('token', data.token)
    token.value = data.token
    user.value = data.user
    await loadPrivate()
    show('/products')
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Authentication failed. Please try again.'
  }
}

async function logout() {
  if (token.value) await api.post('/logout').catch(() => null)
  localStorage.removeItem('token')
  token.value = null
  user.value = null
  show('/login')
}

async function addCart(productId: number) {
  await api.post('/cart', { product_id: productId, quantity: 1 })
  message.value = 'Added to cart.'
  await loadPrivate()
}

async function updateCart(item: any, quantity: number) {
  if (quantity < 1) return
  await api.put(`/cart/${item.id}`, { quantity })
  await loadPrivate()
}

async function removeCart(item: any) {
  await api.delete(`/cart/${item.id}`)
  await loadPrivate()
}

async function addWishlist(productId: number) {
  await api.post('/wishlist', { product_id: productId })
  message.value = 'Saved to wishlist.'
  await loadPrivate()
}

async function removeWishlist(productId: number) {
  await api.delete(`/wishlist/${productId}`)
  await loadPrivate()
}

async function placeOrder() {
  clear()
  await api.post('/checkout', checkout)
  Object.assign(checkout, { customer_name: '', phone: '', address: '' })
  message.value = 'Order created.'
  await loadPrivate()
  show('/orders')
}

async function saveProfile() {
  clear()
  user.value = (await api.put('/profile', { name: profile.name, email: profile.email })).data
  message.value = 'Profile updated.'
}

async function changePassword() {
  clear()
  await api.put('/password', profile)
  profile.current_password = profile.password = profile.password_confirmation = ''
  message.value = 'Password changed.'
}

async function submitReview() {
  clear()
  await api.post(`/products/${product.value.id}/reviews`, review)
  review.comment = ''
  await loadProduct()
}

function clear() {
  message.value = ''
  error.value = ''
}

watch(page, async () => {
  clear()
  if (page.value === 'products') await loadProducts()
  if (page.value === 'product') await loadProduct()
  if (['wishlist', 'cart', 'orders', 'profile'].includes(page.value)) await loadPrivate()
})

onMounted(async () => {
  try {
    await loadPublic()
    await loadPrivate()
    if (page.value === 'product') await loadProduct()
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Could not load data. Check that Laravel is running.'
  }
})
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <nav class="nav">
        <RouterLink class="brand" to="/">AVOCADOO</RouterLink>
        <RouterLink to="/products">Products</RouterLink>
        <RouterLink to="/wishlist">Wishlist</RouterLink>
        <RouterLink to="/cart">Cart ({{ cart.length }})</RouterLink>
        <RouterLink to="/orders">Orders</RouterLink>
        <RouterLink to="/profile">Profile</RouterLink>
        <RouterLink v-if="!token" to="/login">Login</RouterLink>
        <button v-else class="ghost" @click="logout">Logout</button>
      </nav>
    </header>

    <section v-if="page === 'home'" class="hero">
      <div class="wrap">
        <div>
          <h1>Customer E-Commerce Website</h1>
          <p class="muted">Browse products, search by category, save wishlist items, checkout, and review orders.</p>
          <button @click="show('/products')">Shop Products</button>
        </div>
      </div>
    </section>

    <main class="wrap">
      <p v-if="message" class="ok">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>

      <section v-if="page === 'products' || page === 'home'">
        <h2>Products</h2>
        <div class="toolbar">
          <input v-model="filters.search" placeholder="Search products" @input="loadProducts">
          <select v-model="filters.category_id" @change="loadProducts"><option value="">All categories</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select>
        </div>
        <div class="grid">
          <article v-for="p in products" :key="p.id" class="card">
            <img class="product-img" :src="p.image_url || 'https://placehold.co/600x450?text=Product'" :alt="p.name">
            <h3>{{ p.name }}</h3>
            <p class="muted">{{ p.category?.name }}</p>
            <p class="price">{{ money(p.price) }}</p>
            <div class="row"><button @click="show(`/product/${p.id}`)">View</button><button class="ghost" @click="addCart(p.id)">Cart</button><button class="ghost" @click="addWishlist(p.id)">Wishlist</button></div>
          </article>
        </div>
      </section>

      <section v-if="page === 'product' && product" class="split">
        <div class="panel">
          <img class="product-img" :src="product.image_url || 'https://placehold.co/900x675?text=Product'" :alt="product.name">
          <h1>{{ product.name }}</h1>
          <p class="muted">{{ product.category?.name }}</p>
          <p>{{ product.description }}</p>
          <p class="price">{{ money(product.price) }}</p>
          <div class="row"><button @click="addCart(product.id)">Add to Cart</button><button class="ghost" @click="addWishlist(product.id)">Wishlist</button></div>
        </div>
        <aside class="panel">
          <h2>Reviews</h2>
          <div v-for="r in product.reviews" :key="r.id">
            <b>{{ r.user?.name }}</b> <span class="rating">{{ r.rating }}/5</span>
            <p>{{ r.comment }}</p>
          </div>
          <form v-if="token" @submit.prevent="submitReview">
            <label>Rating</label><select v-model="review.rating"><option v-for="n in 5" :key="n">{{ n }}</option></select>
            <label>Comment</label><textarea v-model="review.comment"></textarea>
            <p><button>Submit Review</button></p>
          </form>
        </aside>
      </section>

      <section v-if="page === 'login'" class="panel">
        <h1>Login / Register</h1>
        <label>Name</label><input v-model="auth.name" placeholder="Only required for register">
        <label>Email</label><input v-model="auth.email" type="email">
        <label>Password</label><input v-model="auth.password" type="password">
        <label>Confirm Password</label><input v-model="auth.password_confirmation" type="password">
        <p class="row"><button @click="login(false)">Login</button><button class="ghost" @click="login(true)">Register</button></p>
      </section>

      <section v-if="page === 'wishlist'">
        <h1>Wishlist</h1>
        <div class="list"><div v-for="w in wishlist" :key="w.id" class="card row"><b>{{ w.product.name }}</b><span class="price">{{ money(w.product.price) }}</span><button class="danger" @click="removeWishlist(w.product_id)">Remove</button></div></div>
      </section>

      <section v-if="page === 'cart'" class="split">
        <div><h1>Cart</h1><div class="list"><div v-for="item in cart" :key="item.id" class="card row"><b>{{ item.product.name }}</b><span>{{ money(item.product.price) }}</span><button class="ghost" @click="updateCart(item,item.quantity-1)">-</button><span>{{ item.quantity }}</span><button class="ghost" @click="updateCart(item,item.quantity+1)">+</button><button class="danger" @click="removeCart(item)">Remove</button></div></div></div>
        <aside class="panel"><h2>Total: {{ money(total) }}</h2><button @click="show('/checkout')">Checkout</button></aside>
      </section>

      <section v-if="page === 'checkout'" class="panel">
        <h1>Checkout</h1>
        <label>Name</label><input v-model="checkout.customer_name">
        <label>Phone</label><input v-model="checkout.phone">
        <label>Address</label><textarea v-model="checkout.address"></textarea>
        <p><button @click="placeOrder">Place Order {{ money(total) }}</button></p>
      </section>

      <section v-if="page === 'orders'">
        <h1>Order History</h1>
        <div class="list"><div v-for="o in orders" :key="o.id" class="card"><h3>#{{ o.id }} - {{ o.status }} - {{ money(o.total) }}</h3><p v-for="i in o.items" :key="i.id">{{ i.product_name }} x {{ i.quantity }} = {{ money(i.subtotal) }}</p></div></div>
      </section>

      <section v-if="page === 'profile'" class="split">
        <div class="panel"><h1>Profile</h1><label>Name</label><input v-model="profile.name"><label>Email</label><input v-model="profile.email"><p><button @click="saveProfile">Save Profile</button></p></div>
        <div class="panel"><h2>Change Password</h2><label>Current Password</label><input v-model="profile.current_password" type="password"><label>New Password</label><input v-model="profile.password" type="password"><label>Confirm Password</label><input v-model="profile.password_confirmation" type="password"><p><button @click="changePassword">Change Password</button></p></div>
      </section>
    </main>
  </div>
</template>
