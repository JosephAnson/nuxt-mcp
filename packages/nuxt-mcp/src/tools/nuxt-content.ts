import type { CollectionType, ResolvedCollection, ResolvedCollectionSource } from '@nuxt/content'
import type { ZodObject, ZodRawShape } from 'zod'
import type { McpToolContext } from '../types'
import { defineCollection } from '@nuxt/content'
import { loadConfig } from 'c12'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

export interface DefinedCollection<T extends ZodRawShape = ZodRawShape> {
  type: CollectionType
  source: ResolvedCollectionSource[] | undefined
  schema: ZodObject<T>
  extendedSchema: ZodObject<T>
  fields: Record<string, 'string' | 'number' | 'boolean' | 'date' | 'json'>
}

const defaultConfig: NuxtContentConfig = {
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*',
    }),
  },
}

interface NuxtContentConfig {
  collections: Record<string, DefinedCollection>
}

function getTableName(name: string): string {
  return `_content_${name}`
}

function resolveCollection(name: string, collection: DefinedCollection): ResolvedCollection | undefined {
  if (/^[a-z_]\w*$/i.test(name) === false) {
    return undefined
  }

  return {
    ...collection,
    name,
    type: collection.type || 'page',
    tableName: getTableName(name),
    private: name === 'info',
  }
}

function resolveCollections(collections: Record<string, DefinedCollection>): ResolvedCollection[] {
  collections.info = {
    type: 'data',
    source: undefined,
    schema: z.object({
      id: z.string(),
      version: z.string(),
      structureVersion: z.string(),
      ready: z.boolean(),
    }),
    extendedSchema: z.object({
      id: z.string(),
      version: z.string(),
      structureVersion: z.string(),
      ready: z.boolean(),
    }),
    fields: {},
  }

  return Object.entries(collections)
    .map(([name, collection]) => resolveCollection(name, collection))
    .filter(Boolean) as ResolvedCollection[]
}

async function loadContentConfig(nuxt: McpToolContext['nuxt']): Promise<{ collections: ResolvedCollection<ZodRawShape>[] }> {
  (globalThis as any).defineContentConfig = (c: any) => c

  delete (globalThis as any).defineContentConfig

  const layers = [...nuxt.options._layers].reverse()
  const contentConfigs = await Promise.all(
    layers.map(
      layer => loadConfig<NuxtContentConfig>({ name: 'content', cwd: layer.config.rootDir, defaultConfig }),
    ),
  )

  if (nuxt.options.dev) {
    nuxt.hook('close', () => Promise.all(contentConfigs.map((c: any) => c.unwatch())).then(() => {}))
  }

  const collectionsConfig = contentConfigs.reduce((acc: any, curr: { config: { collections: any } }) => ({ ...acc, ...curr.config?.collections }), {} as Record<string, DefinedCollection>)
  const hasNoCollections = Object.keys(collectionsConfig || {}).length === 0

  if (hasNoCollections) {
    return { collections: [] }
  }

  const collections = resolveCollections(hasNoCollections ? defaultConfig.collections : collectionsConfig)

  return { collections }
}

/**
 * Register Nuxt modules-related MCP tools
 */
export async function toolsNuxtContent({ nuxt, mcp }: McpToolContext): Promise<void> {
  const nuxtContentModule = nuxt.options._installedModules.find(item => item.meta.name === 'Content')
  // Check if @nuxt/content is installed
  if (!nuxtContentModule) {
    return
  }

  const nuxtContentConfig = await loadContentConfig(nuxt)

  mcp.tool(
    'get-content-directory',
    'Get the content directory',
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: `${nuxt.options.rootDir}/content/`,
          },
        ],
      }
    },
  )

  mcp.tool(
    'get-content-directory-by-collection',
    'Get the content directory by collection',
    {
      collection: z.string().describe('Name of the collection'),
    },
    async ({ collection }) => {
      return {
        content: [
          {
            type: 'text',
            text: `${nuxt.options.rootDir}/content/${collection}`,
          },
        ],
      }
    },
  )

  mcp.tool(
    'list-collections',
    'List all collections in the content directory',
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: `Collections: ${nuxtContentConfig.collections.map(c => c.name).join(', ')}`,
          },
        ],
      }
    },
  )

  // Module find command - finds a module by name
  mcp.tool(
    `get-collection-schema`,
    `Get the schema for a collection, make sure to create the file after generating the content`,
    {
      collection: z.string().describe('Name of the collection'),
    },
    async ({ collection }) => {
      const collectionItem = nuxtContentConfig.collections.find(c => c.name === collection)

      if (!collectionItem) {
        return {
          content: [
            { type: 'text', text: `Collection ${collection} not found` },
          ],
          isError: true,
        }
      }

      return {
        content: [
          {
            type: 'text',
            // text: `Content for ${name} collection for file ${config.source}: ${JSON.stringify(result, null, 2)}`,
            text: `Schema for ${collection} collection to be generated: ${JSON.stringify(zodToJsonSchema(collectionItem.extendedSchema), null, 2)}`,
          },
        ],
      }
    },
  )

  // nuxtContentConfig.collections.forEach((config) => {
  //   // Module find command - finds a module by name
  //   mcp.tool(
  //     `generate-content-${config.name}`,
  //     `Generate content based on object for ${config.name} collection at ${`${nuxt.options.rootDir}/content/${config.source}`}`,
  //     {
  //       result: config.extendedSchema,
  //     },
  //     async ({ result }) => {
  //       return {
  //         content: [
  //           {
  //             type: 'text',
  //             text: `Content for ${config.name} collection for file ${config.source}: ${JSON.stringify(result, null, 2)}`,
  //           },
  //         ],
  //       }
  //     },
  //   )
  // })
}
