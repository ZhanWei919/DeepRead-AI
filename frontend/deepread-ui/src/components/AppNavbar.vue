<template>
  <nav class="navbar" :class="{ visible: isVisible }">
    <div class="nav-title">ScholarAI</div>
    <div class="nav-actions">
      <button
        class="nav-button"
        title="Settings"
        @click="$emit('open-settings')"
      >
        <!-- SVG Icon for Settings -->
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M19.4 15C19.2669 15.3016 19.2271 15.6362 19.2857 15.9606C19.3443 16.285 19.4986 16.5839 19.7266 16.8167C19.9546 17.0495 20.2446 17.2048 20.5546 17.2603C20.8646 17.3158 21.1788 17.269 21.458 17.126L21.542 17.074C21.8196 16.9326 22.0485 16.7075 22.1969 16.4296C22.3453 16.1517 22.4059 15.8346 22.37 15.52C22.342 15.348 22.342 15.172 22.37 15C22.342 14.828 22.342 14.652 22.37 14.48C22.4059 14.1654 22.3453 13.8483 22.1969 13.5704C22.0485 13.2925 21.8196 13.0674 21.542 12.926L21.458 12.874C21.1788 12.731 20.8646 12.6842 20.5546 12.7397C20.2446 12.7952 19.9546 12.9505 19.7266 13.1833C19.4986 13.4161 19.3443 13.715 19.2857 14.0394C19.2271 14.3638 19.2669 14.6984 19.4 15"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M4.6 15C4.73312 15.3016 4.7729 15.6362 4.71429 15.9606C4.65569 16.285 4.50142 16.5839 4.27342 16.8167C4.04542 17.0495 3.75536 17.2048 3.44536 17.2603C3.13536 17.3158 2.82116 17.269 2.542 17.126L2.458 17.074C2.18044 16.9326 1.95153 16.7075 1.80311 16.4296C1.65469 16.1517 1.59411 15.8346 1.63 15.52C1.658 15.348 1.658 15.172 1.63 15C1.658 14.828 1.658 14.652 1.63 14.48C1.59411 14.1654 1.65469 13.8483 1.80311 13.5704C1.95153 13.2925 2.18044 13.0674 2.458 12.926L2.542 12.874C2.82116 12.731 3.13536 12.6842 3.44536 12.7397C3.75536 12.7952 4.04542 12.9505 4.27342 13.1833C4.50142 13.4161 4.65569 13.715 4.71429 14.0394C4.7729 14.3638 4.73312 14.6984 4.6 15"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M15 4.6C15.3016 4.73312 15.6362 4.7729 15.9606 4.71429C16.285 4.65569 16.5839 4.50142 16.8167 4.27342C17.0495 4.04542 17.2048 3.75536 17.2603 3.44536C17.3158 3.13536 17.269 2.82116 17.126 2.542L17.074 2.458C16.9326 2.18044 16.7075 1.95153 16.4296 1.80311C16.1517 1.65469 15.8346 1.59411 15.52 1.63C15.348 1.658 15.172 1.658 15 1.63C14.828 1.658 14.652 1.658 14.48 1.63C14.1654 1.59411 13.8483 1.65469 13.5704 1.80311C13.2925 1.95153 13.0674 2.18044 12.926 2.458L12.874 2.542C12.731 2.82116 12.6842 3.13536 12.7397 3.44536C12.7952 3.75536 12.9505 4.04542 13.1833 4.27342C13.4161 4.50142 13.715 4.65569 14.0394 4.71429C14.3638 4.7729 14.6984 4.73312 15 4.6"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M15 19.4C14.6984 19.2669 14.3638 19.2271 14.0394 19.2857C13.715 19.3443 13.4161 19.4986 13.1833 19.7266C12.9505 19.9546 12.7952 20.2446 12.7397 20.5546C12.6842 20.8646 12.731 21.1788 12.874 21.458L12.926 21.542C13.0674 21.8196 13.2925 22.0485 13.5704 22.1969C13.8483 22.3453 14.1654 22.4059 14.48 22.37C14.652 22.342 14.828 22.342 15 22.37C15.172 22.342 15.348 22.342 15.52 22.37C15.8346 22.4059 16.1517 22.3453 16.4296 22.1969C16.7075 22.0485 16.9326 21.8196 17.074 21.542L17.126 21.458C17.269 21.1788 17.3158 20.8646 17.2603 20.5546C17.2048 20.2446 17.0495 19.9546 16.8167 19.7266C16.5839 19.4986 16.285 19.3443 15.9606 19.2857C15.6362 19.2271 15.3016 19.2669 15 19.4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <!-- Add other nav buttons here if needed -->
    </div>
  </nav>
</template>

<script setup lang="ts">
/* eslint-disable vue/multi-word-component-names */ // Or rename the component file and usage
defineProps<{
  isVisible: boolean;
}>();

defineEmits(["open-settings"]);
</script>

<style scoped>
/* Styles copied directly from frontend_design.txt for .navbar section */
.navbar {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px); /* Safari support */
  height: 48px;
  border-bottom: 1px solid var(--apple-gray-2);
  display: flex;
  align-items: center;
  padding: 0 20px;
  position: fixed;
  width: 100%;
  top: -48px; /* Initially hidden */
  left: 0; /* Ensure it spans full width */
  z-index: 30;
  transition: top 0.3s ease;
}

.navbar.visible {
  top: 0; /* Slide in */
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--apple-gray-5);
}

.nav-actions {
  margin-left: auto;
  display: flex;
  gap: 15px;
}

.nav-button {
  background: none;
  border: none;
  color: var(--apple-blue);
  font-size: 14px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
  display: flex; /* Align icon nicely */
  align-items: center;
  justify-content: center;
}

.nav-button:hover {
  background-color: rgba(0, 123, 255, 0.1);
}

.nav-button svg {
  display: block; /* Prevents extra space below SVG */
}
</style>
