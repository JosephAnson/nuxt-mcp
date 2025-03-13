import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['../src/module', '@nuxt/content'],
  devtools: { enabled: true },
  compatibilityDate: '2025-03-11',
  debug: false,
})
