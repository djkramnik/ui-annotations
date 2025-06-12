export const SimpleDate = ({
  date
}: { date: string }) => {
  return (
    <>{new Date(date).toLocaleDateString()} {new Date(date).toLocaleTimeString()}</>
  )
}