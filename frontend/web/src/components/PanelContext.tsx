'use client'

import { createContext, useContext } from 'react'
import type { Branch, Business, BusinessSetup, Session } from '@/types/domain'

// What every panel section receives from the panel shell: who is signed
// in, their business, the Jefe's selected branch and the live branch setup.
export interface PanelValue {
  session: Session
  business: Business | null
  activeBranch: Branch | null
  branches: Branch[]
  setup: BusinessSetup | null
}

export const PanelContext = createContext<PanelValue | null>(null)

export function usePanel(): PanelValue {
  const value = useContext(PanelContext)
  if (!value) throw new Error('usePanel must be used inside the panel layout')
  return value
}

// Sections of a business (Jefe or linked Empleado). The panel only opens
// them when the signed-in user has a business (RF-W04, RN-10).
export interface BusinessPanelValue extends PanelValue {
  business: Business
  setup: BusinessSetup
}
export function useBusinessPanel(): BusinessPanelValue {
  const value = usePanel()
  if (!value.business || !value.setup) throw new Error('This section needs a business')
  return value as BusinessPanelValue
}

// Sections that follow the Jefe's branch selector (agenda, orders,
// products, dashboard). The panel opens them only when a branch exists.
export interface BranchPanelValue extends BusinessPanelValue {
  activeBranch: Branch
}
export function useBranchPanel(): BranchPanelValue {
  const value = useBusinessPanel()
  if (!value.activeBranch) throw new Error('This section needs a branch')
  return value as BranchPanelValue
}
