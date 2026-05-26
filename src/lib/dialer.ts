export type DialerPreference = 'default' | 'skype' | 'zoom' | 'ringcentral'

export const DIALER_OPTIONS: { value: DialerPreference; label: string }[] = [
  { value: 'default',     label: 'System Default (Google Voice, Avidbit, etc.)' },
  { value: 'skype',       label: 'Skype' },
  { value: 'zoom',        label: 'Zoom Phone' },
  { value: 'ringcentral', label: 'RingCentral' },
]

export function buildDialerUrl(phone: string, dialer: string): string {
  const digits = phone.replace(/\D/g, '')
  const e164 = digits.startsWith('1') ? `+${digits}` : `+1${digits}`
  switch (dialer) {
    case 'skype':       return `skype:${e164}?call`
    case 'zoom':        return `zoomphonecall:${e164}`
    case 'ringcentral': return `rcmobile://call?number=${e164}`
    default:            return `tel:${e164}`
  }
}
