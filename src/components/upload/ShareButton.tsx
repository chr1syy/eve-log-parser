'use client'

import { useState } from 'react'
import { Link as LinkIcon, Check, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { ParsedLog } from '@/lib/types'

interface ShareButtonProps {
  log: ParsedLog
}

type State = 'idle' | 'loading' | 'copied' | 'error'

export default function ShareButton({ log }: ShareButtonProps) {
  const [state, setState] = useState<State>('idle')

  const handleShare = async () => {
    setState('loading')
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log }),
      })

      if (!res.ok) throw new Error('Upload failed')

      const { uuid } = (await res.json()) as { uuid: string }
      const shareUrl = `${window.location.origin}/share/${uuid}`
      await navigator.clipboard.writeText(shareUrl)
      setState('copied')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const icon =
    state === 'loading' ? (
      <Loader2 size={12} className="animate-spin" />
    ) : state === 'copied' ? (
      <Check size={12} />
    ) : (
      <LinkIcon size={12} />
    )

  const label =
    state === 'copied' ? 'LINK COPIED' : state === 'error' ? 'SHARE FAILED' : 'SHARE'

  return (
    <Button
      variant="secondary"
      size="sm"
      icon={icon}
      onClick={handleShare}
      disabled={state === 'loading'}
    >
      {label}
    </Button>
  )
}
