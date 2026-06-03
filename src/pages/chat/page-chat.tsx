import ComPage from "@/components/layout/com-page"

export default function PageChat() {
  return (
    <div>
      <ComPage>
        {Array.from({ length: 24 }).map((_, index) => (
          <div
            key={index}
            className="aspect-video h-12 w-full rounded-lg bg-muted/50"
          />
        ))}
      </ComPage>
    </div>
  )
}
