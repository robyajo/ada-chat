export default function RowChat({ chating }: { chating: any[] }) {
  return (
    <>
      {chating.map((chat) => (
        <a
          href="#"
          key={chat.email}
          className="flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <div className="flex w-full items-center gap-2">
            <span>{chat.name}</span>{" "}
            <span className="ml-auto text-xs">{chat.date}</span>
          </div>
          <span className="font-medium">{chat.subject}</span>
          <span className="line-clamp-2 w-[260px] text-xs whitespace-break-spaces">
            {chat.teaser}
          </span>
        </a>
      ))}
    </>
  )
}
