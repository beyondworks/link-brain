'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ko">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '16px',
            fontFamily: 'sans-serif',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>문제가 발생했습니다</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{error.message}</p>
          <button
            onClick={reset}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
