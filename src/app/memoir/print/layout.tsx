import './print.css';

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'white', color: '#2C3E5C', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
