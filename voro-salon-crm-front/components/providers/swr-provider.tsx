"use client"

import type { ReactNode } from "react"
import { SWRConfig } from "swr"

/**
 * Configuração global do SWR.
 *
 * Sem ela valem os defaults da biblioteca, e o principal deles — `revalidateOnFocus:
 * true` — refaz **todas** as queries montadas toda vez que a aba ganha foco. Como cada
 * requisição à API é uma ida ao Postgres, alternar de aba gerava uma rajada de carga
 * sem nenhuma mudança de dado do outro lado.
 *
 * As telas que precisam de dado quente já declaram `refreshInterval` próprio, e toda
 * escrita chama `mutate`, então revalidar por foco era redundante. O polling do SWR
 * já pausa sozinho quando a aba está oculta (`refreshWhenHidden` é `false` por padrão).
 */
export function SwrProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        // margem para que dois componentes que montam a mesma chave quase ao mesmo
        // tempo (sidebar e layout raiz, por exemplo) façam uma requisição só
        dedupingInterval: 5000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
