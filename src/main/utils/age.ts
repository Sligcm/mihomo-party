const AGE_ARMOR_HEADER = '-----BEGIN AGE ENCRYPTED FILE-----'

type AgeModule = typeof import('age-encryption')

let ageModulePromise: Promise<AgeModule> | undefined

function loadAgeModule(): Promise<AgeModule> {
  ageModulePromise ??= import('age-encryption')
  return ageModulePromise
}

export function isAgeArmored(content: string): boolean {
  return content
    .replace(/^\uFEFF/, '')
    .trimStart()
    .startsWith(AGE_ARMOR_HEADER)
}

export function parseAgeSecretKeys(secretKey: string | undefined): string[] {
  if (!secretKey) return []

  return secretKey
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part.startsWith('AGE-SECRET-KEY-1') || part.startsWith('AGE-SECRET-KEY-PQ-1'))
}

export async function decryptAgeContent(
  content: string,
  secretKey: string | undefined,
  label = 'config'
): Promise<string> {
  if (!isAgeArmored(content)) return content

  const identities = parseAgeSecretKeys(secretKey)
  if (identities.length === 0) {
    throw new Error(`Age encrypted ${label} requires an age secret key`)
  }

  try {
    const age = await loadAgeModule()
    const decrypter = new age.Decrypter()
    identities.forEach((identity) => decrypter.addIdentity(identity))
    return await decrypter.decrypt(age.armor.decode(content), 'text')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to decrypt age ${label}: ${message}`)
  }
}
