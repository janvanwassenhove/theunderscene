import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'
import { setupPwa } from './pwa'

setupPwa()
createApp(App).mount('#app')
