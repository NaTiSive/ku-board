interface AvatarProps {
  name: string
  imageUrl?: string | null
  className?: string
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export default function Avatar({ name, imageUrl, className = 'avatar' }: AvatarProps) {
  if (imageUrl) {
    return (
      <div className={className} aria-hidden="true">
        <img className={`${className}-image`} src={imageUrl} alt="" />
      </div>
    )
  }

  return (
    <div className={`${className} is-default`} aria-label={`${name} avatar`} role="img">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 12.25a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2.5c-4.22 0-7.75 2.29-7.75 5.25 0 .41.34.75.75.75h14c.41 0 .75-.34.75-.75 0-2.96-3.53-5.25-7.75-5.25Z"
          fill="currentColor"
        />
      </svg>
      <span className={`${className}-fallback`}>{getInitial(name)}</span>
    </div>
  )
}
