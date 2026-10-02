import React from 'react'

export default function ProgramIcon({ program }) {
  return <img className="program-icon" src={program === 'all' ? '/brand-mark.svg' : `/programs/${program}.${program === 'esoc' ? 'webp' : 'png'}`} width="18" height="18" alt="" aria-hidden="true" />
}
