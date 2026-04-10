import campusIllustration from '../assets/campus-illustration.svg'
import type { Comment, Post, UserProfile } from '../types'

export const mockPosts: Post[] = [
  {
    id: 'post-1',
    author: {
      id: 'ku-20260001',
      name: 'Praewa S.',
      handle: 'praewa.ku',
      role: 'member',
    },
    content:
      'Dorm swap week is coming. Anyone in A4 looking to trade with a room closer to the library? I can throw in a mini-fridge.',
    image: campusIllustration,
    createdAt: '2026-04-10T10:20:00+07:00',
    updatedAt: '2026-04-10T11:04:00+07:00',
    likes: 128,
    comments: 24,
    shares: 12,
    likedByMe: true,
    tags: ['Dorm', 'Swap'],
  },
  {
    id: 'post-2',
    author: {
      id: 'ku-20260077',
      name: 'Nattapong K.',
      handle: 'nattapong.ku',
      role: 'member',
    },
    content:
      'Selling two tickets for KU Music Night. Meet-up at the student union. Price negotiable for freshmen.',
    createdAt: '2026-04-10T09:05:00+07:00',
    likes: 54,
    comments: 9,
    shares: 4,
    tags: ['Event', 'Tickets'],
  },
  {
    id: 'post-3',
    author: {
      id: 'ku-20260033',
      name: 'Sirada L.',
      handle: 'sirada.design',
      role: 'member',
    },
    content:
      'Late-night studio buddies? I am pulling an all-nighter in the architecture lab and could use coffee suggestions.',
    createdAt: '2026-04-10T08:10:00+07:00',
    likes: 76,
    comments: 18,
    shares: 6,
    tags: ['Study', 'CampusLife'],
  },
]

export const mockComments: Comment[] = [
  {
    id: 'comment-1',
    authorName: 'Anonymous',
    isAnonymous: true,
    createdAt: '2026-04-10T11:20:00+07:00',
    content: 'Try the cafe behind the engineering building. They stay open late.',
  },
  {
    id: 'comment-2',
    authorName: 'K. Thana',
    createdAt: '2026-04-10T11:42:00+07:00',
    content: 'I can swap dorms. Sent you a message in KU Mail.',
    role: 'member',
  },
]

export const mockUsers: UserProfile[] = [
  {
    id: 'ku-20260001',
    displayName: 'Praewa S.',
    handle: 'praewa.ku',
    role: 'member',
    status: 'active',
  },
  {
    id: 'ku-20260077',
    displayName: 'Nattapong K.',
    handle: 'nattapong.ku',
    role: 'member',
    status: 'active',
  },
  {
    id: 'ku-20260112',
    displayName: 'K. Anchalee',
    handle: 'anchalee.ku',
    role: 'member',
    status: 'banned',
  },
]
