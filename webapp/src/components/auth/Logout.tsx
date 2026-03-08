type LogoutProps = {
  username: string;
  onLogout: () => void;
};

function Logout({ username, onLogout }: LogoutProps) {
  return (
    <div style={{ marginBottom: '20px', textAlign: 'right' }}>
      <p>
        Conectado como: <strong>{username}</strong>
      </p>

      <button
        onClick={onLogout}
        style={{
          padding: '8px 16px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Desconectar
      </button>
    </div>
  );
}

export default Logout;