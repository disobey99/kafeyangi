export default function CustomerMenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="customer-menu-root flex-1">{children}</div>;
}
