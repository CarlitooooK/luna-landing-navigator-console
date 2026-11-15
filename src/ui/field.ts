import { createContext } from 'react'

/**
 * Lo que `Field` comparte con lo que tiene dentro (tareas B1 y B3): el id del control, el id del texto que lo
 * describe (hint o error) y, si hay un "?", el id de su texto oculto, para que el lector de pantalla lo lea al enfocar el campo.
 */
export const FieldContext = createContext<{ id: string; describedBy?: string; helpId?: string } | null>(null)
