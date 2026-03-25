<template>
  <Teleport to="body">
    <Transition name="confirm-overlay">
      <div
        v-if="modelValue"
        class="confirm-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="onCancel"
      >
        <Transition name="confirm-panel" appear>
          <div class="confirm-panel" :class="variant">
            <div class="confirm-icon" :class="variant" aria-hidden="true">
              <svg v-if="variant === 'danger'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
              </svg>
              <svg v-else-if="variant === 'warning'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </div>

            <h2 :id="titleId" class="confirm-title">{{ title }}</h2>

            <div class="confirm-body">
              <slot>
                <p v-if="description" class="confirm-desc">{{ description }}</p>
              </slot>
            </div>

            <div class="confirm-actions">
              <button type="button" class="btn btn-outline confirm-btn-cancel" :disabled="loading" @click="onCancel">
                {{ cancelLabel }}
              </button>
              <button
                type="button"
                class="btn confirm-btn-primary"
                :class="variant === 'danger' ? 'btn-danger' : 'btn-primary'"
                :disabled="loading"
                @click="emit('confirm')"
              >
                <span v-if="loading" class="confirm-spinner" aria-hidden="true" />
                {{ loading ? loadingLabel : confirmLabel }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    loadingLabel?: string
    loading?: boolean
    variant?: 'danger' | 'warning' | 'default'
  }>(),
  {
    description: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    loadingLabel: 'Please wait…',
    loading: false,
    variant: 'default',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const titleId = `confirm-title-${Math.random().toString(36).slice(2, 9)}`

const onCancel = () => {
  if (props.loading) return
  emit('update:modelValue', false)
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue && !props.loading) {
    onCancel()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (import.meta.client) {
      document.body.style.overflow = open ? 'hidden' : ''
      if (open) {
        window.addEventListener('keydown', onKeydown)
      } else {
        window.removeEventListener('keydown', onKeydown)
      }
    }
  },
)

onUnmounted(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
}

.confirm-panel {
  width: 100%;
  max-width: 28rem;
  padding: 1.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.confirm-panel.danger {
  border-top: 3px solid var(--danger);
}

.confirm-panel.warning {
  border-top: 3px solid #fbbf24;
}

.confirm-icon {
  width: 3rem;
  height: 3rem;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.confirm-icon.danger {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.confirm-icon.warning {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.confirm-icon.default {
  background: rgba(16, 185, 129, 0.15);
  color: var(--primary);
}

.confirm-icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.confirm-title {
  font-size: 1.125rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.75rem;
  line-height: 1.35;
}

.confirm-body {
  margin-bottom: 1.25rem;
  text-align: left;
}

.confirm-desc {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.55;
  white-space: pre-wrap;
  text-align: center;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: stretch;
}

.confirm-actions .btn {
  flex: 1;
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
}

.confirm-btn-cancel:disabled,
.confirm-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.confirm-spinner {
  display: inline-block;
  width: 0.9rem;
  height: 0.9rem;
  margin-right: 0.35rem;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: var(--text);
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
  vertical-align: middle;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.confirm-overlay-enter-active,
.confirm-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-overlay-enter-from,
.confirm-overlay-leave-to {
  opacity: 0;
}

.confirm-panel-enter-active {
  transition: opacity 0.2s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.confirm-panel-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}

.confirm-panel-leave-active {
  transition: opacity 0.15s ease;
}

.confirm-panel-leave-to {
  opacity: 0;
}
</style>
