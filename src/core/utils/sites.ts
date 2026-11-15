import type { SelectedSite } from '@/core/store/useMissionStore'
import type { Site } from '@/types'

/** Un sitio de `/sites` como sitio elegido en Setup. */
export const toSelected = (s: Site): SelectedSite => ({ id: s.id, lat: s.lat, lon: s.lon, label: s.name, category: s.category })
