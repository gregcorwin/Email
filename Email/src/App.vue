<script setup>
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <header>
    <nav>
      <router-link to="/">Home</router-link>
      <router-link to="/templates">Templates</router-link>
    </nav>
  </header>
  <main>
    <router-view />
  </main>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
header {
  background-color: #f0f0f0;
  padding: 10px;
  margin-bottom: 20px;
  text-align: center;
}
nav a {
  margin: 0 15px;
  text-decoration: none;
  color: #333;
  font-size: 1.1em;
}
nav a.router-link-exact-active {
  font-weight: bold;
  color: #42b983;
  border-bottom: 2px solid #42b983;
  padding-bottom: 2px;
}
main {
  padding: 0 20px;
}
</style>
