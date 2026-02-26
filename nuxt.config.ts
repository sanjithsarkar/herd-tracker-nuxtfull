export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  ssr: false,

  devServer: {
    port: 4000,
  },

  modules: [
    '@pinia/nuxt',
  ],

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Herd Tracker',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Track your own device location in real-time' },
        { name: 'theme-color', content: '#10b981' },
      ],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
        },
      ],
    },
  },
})
