"use client"

import { useEffect, useState } from "react"

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        setValue(JSON.parse(saved))
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
    }
  }, [key])

  const setStoredValue = (newValue: T) => {
    try {
      setValue(newValue)
      localStorage.setItem(key, JSON.stringify(newValue))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [value, setStoredValue] as const
}