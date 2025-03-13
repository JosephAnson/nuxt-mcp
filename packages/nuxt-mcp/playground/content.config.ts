import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      source: 'blog/*.md',
      type: 'page',
      // Define custom schema for docs collection
      schema: z.object({
        tags: z.array(z.string()),
        image: z.string(),
        date: z.date(),
      }),
    }),
    projects: defineCollection({
      source: 'projects/*.md',
      type: 'page',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        image: z.string(),
        date: z.date(),
        url: z.string(),
      }),
    }),
  },
})
