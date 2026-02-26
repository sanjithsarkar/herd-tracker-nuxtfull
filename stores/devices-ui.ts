export const useDevicesUiStore = defineStore('devices-ui', {
  state: () => ({
    newDeviceType: 'mobile' as 'mobile' | 'laptop',
    newImei: '',
    newIdentifier: '',
    newName: '',
    adding: false,
    addError: '',
    devicesLoading: false,
    editingId: null as string | null,
    editName: '',
  }),

  actions: {
    setNewDeviceType(type: 'mobile' | 'laptop') {
      this.newDeviceType = type
    },

    setNewImei(value: string) {
      this.newImei = value
    },

    setNewIdentifier(value: string) {
      this.newIdentifier = value
    },

    setNewName(value: string) {
      this.newName = value
    },

    setAdding(value: boolean) {
      this.adding = value
    },

    setAddError(value: string) {
      this.addError = value
    },

    setDevicesLoading(value: boolean) {
      this.devicesLoading = value
    },

    resetAddForm() {
      this.newImei = ''
      this.newIdentifier = ''
      this.newName = ''
      this.addError = ''
    },

    startEdit(deviceId: string, name: string) {
      this.editingId = deviceId
      this.editName = name
    },

    cancelEdit() {
      this.editingId = null
      this.editName = ''
    },

    setEditName(value: string) {
      this.editName = value
    },

    saveEditDone() {
      this.editingId = null
      this.editName = ''
    },
  },
})
