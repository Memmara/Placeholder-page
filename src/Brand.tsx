export function Brand({className = ''}:{className?:string}) {
  return <span className={'brand '+className} aria-label="Memmara">
    <span className="brand-mark" aria-hidden="true"><i/><i/><i/></span>
    Memmara<span className="brand-dot">.</span>
  </span>;
}
