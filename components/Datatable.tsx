type Props = {
  title: string;
  value: string;
};

export default function StatCard({ title, value }: Props) {
  return (
    <div className="border rounded p-4">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}