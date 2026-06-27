import { useState, useCallback } from 'react'
import { parseMatchFile } from '../lib/parseMatchFile'
import type { MatchData } from '../types/match'

type LoadState = 'idle' | 'loading' | 'error' | 'ready'

export function useMatchData() {
  const [state,     setState]     = useState<LoadState>('idle')
  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  const loadFile = useCallback(async (file: File) => {
    setState('loading')
    setError(null)
    try {
      const data = await parseMatchFile(file)
      setMatchData(data)
      setState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file')
      setState('error')
    }
  }, [])

  return { state, matchData, error, loadFile }
}