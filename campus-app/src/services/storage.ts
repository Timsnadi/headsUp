export async function persistWebStorage(): Promise<boolean> {
  if (!('storage' in navigator) || !('persist' in navigator.storage)) {
    return false
  }

  return navigator.storage.persist()
}

export async function isStoragePersisted(): Promise<boolean> {
  if (!('storage' in navigator) || !('persisted' in navigator.storage)) {
    return false
  }

  return navigator.storage.persisted()
}
