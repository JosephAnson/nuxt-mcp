<template>
  <div>
    Nuxt module playground!

    <ContentRenderer v-if="blog" :value="blog" />
    <ContentRenderer v-if="project" :value="project" />
  </div>
</template>

<script setup>
const { data: blog } = await useAsyncData(async () =>  await queryCollection('blog').first())
const { data: project } = await useAsyncData(async () =>  await queryCollection('projects').first())
</script>
