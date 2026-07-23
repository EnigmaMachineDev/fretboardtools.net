import { DIFFICULTY_LABEL, type Difficulty } from '../lib/score'

const STYLES: Record<Difficulty, string> = {
  easy: 'bg-diff-easy/20 text-diff-easy',
  moderate: 'bg-diff-moderate/20 text-diff-moderate',
  hard: 'bg-diff-hard/20 text-diff-hard',
  veryHard: 'bg-diff-veryhard/20 text-diff-veryhard',
  impossible: 'bg-diff-impossible/20 text-diff-impossible',
}

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STYLES[difficulty]}`}>
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  )
}
