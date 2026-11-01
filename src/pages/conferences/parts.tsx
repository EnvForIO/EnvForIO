/**
 * Small parts shared by the conference cards and rows: the follow star
 * and the CCF rank badge.
 */
import { useTranslation } from 'react-i18next'
import { StarIcon } from 'lucide-react'
import { useFollowConference } from '@/api/conferences'
import type { Conference } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'

export function FollowStar({ conference: c }: { conference: Conference }) {
  const { t } = useTranslation()
  const follow = useFollowConference()
  return (
    <button
      type="button"
      title={c.followed ? t('conferences.unfollow') : t('conferences.follow')}
      onClick={() => follow.mutate({ key: c.key, on: !c.followed })}
      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
    >
      <StarIcon
        className={cn(
          'size-4',
          c.followed && 'fill-[#ffcc00] text-[#e6a700] hover:text-[#e6a700]'
        )}
      />
    </button>
  )
}

/** "CCF A"; nothing for unranked (N) conferences. */
export function RankBadge({ ccf }: { ccf: string }) {
  if (!['A', 'B', 'C'].includes(ccf)) return null
  return (
    <span
      className={cn(
        'shrink-0 rounded border px-1 text-[10px] leading-4 font-medium',
        ccf === 'A' && 'border-[#ff3b30]/40 text-[#ff3b30]',
        ccf === 'B' && 'border-[#0071e3]/40 text-[#0071e3]',
        ccf === 'C' && 'text-muted-foreground'
      )}
    >
      CCF {ccf}
    </span>
  )
}
