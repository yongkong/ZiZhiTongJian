import type { Metadata } from 'next'
import { ReviewPractice } from '@/components/ReviewPractice'
import { getCards } from '@/lib/content'

export const metadata: Metadata = { title: '复习' }

export default function Review() {
  return <ReviewPractice cards={getCards()} />
}
