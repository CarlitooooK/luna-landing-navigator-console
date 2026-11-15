import { HelpTip } from '@/ui'
import { GLOSSARY, type HelpId } from './glossary'

/** "?" con el texto del catálogo (tarea B4). Todas las ayudas de la consola pasan por aquí. */
export function Help({ id, className }: { id: HelpId; className?: string }) {
  const e: { term: string; text: string; try?: string } = GLOSSARY[id]
  return <HelpTip term={e.term} text={e.text} tryText={e.try} className={className} />
}
